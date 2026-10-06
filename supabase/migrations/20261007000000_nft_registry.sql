-- NFT registry + ownership history.
--
-- Replaces the flat `ownership` cache with two tables:
--
--   nfts           one row per minted Metaplex Core asset (one copy of a
--                  product). Created when a purchase is verified, or when a
--                  sync finds a copy in a Fuchey collection we hadn't seen.
--   nft_ownership  who has held each NFT, as periods. Exactly one period per
--                  NFT is `is_current`; earlier ones end as "transferred" or
--                  "burned".
--
-- Identities, kept apart:
--   asset_id           Fuchey catalogue id ("yeti") — what the NFT *is*. Many
--                      NFTs share one (editions), so it's indexed, not unique.
--   asset_address      the Core asset account — the NFT's on-chain identity.
--   collection_address the Core collection the product deployed.
--   owner_wallet       a Solana address. Never a wallet *app*.
--   listings           sale state of the product (functions/admin/nft.ts).
--                      A listing never decides who owns anything.
--
-- The chain is the source of truth. Every write here follows a read of the
-- asset account (functions/_shared/nft/ownership.ts); nothing a client sends
-- becomes an owner. If the chain can't be read, the NFT is marked
-- "unverified" and its last known owner is left as it was.

create type public.nft_status as enum (
  'unknown',     -- registered, never read from the chain
  'unverified',  -- last chain read failed; the current owner may be stale
  'owned',       -- current owner read from the chain at last_verified_at
  'burned'       -- the asset account no longer exists
);

create type public.nft_acquisition as enum (
  'marketplace', -- minted to the buyer by a verified Fuchey purchase
  'transfer',    -- moved to this wallet outside the marketplace (seen by a sync)
  'unknown'      -- first seen by a sync; how it got there isn't known
);

create table public.nfts (
  id                 uuid primary key default gen_random_uuid(),
  asset_kind         public.asset_kind not null,
  asset_id           text not null,
  chain              text not null default 'solana',
  network            text not null check (network in ('devnet', 'mainnet-beta')),
  asset_address      text not null check (asset_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  collection_address text not null check (collection_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  name               text,                  -- on-chain name, e.g. "Fuchey Yeti #3"
  metadata_uri       text,                  -- on-chain uri
  metadata_json      jsonb,                 -- the JSON at metadata_uri, as uploaded
  mint_signature     text,
  minted_at          timestamptz,
  status             public.nft_status not null default 'unknown',
  last_verified_at   timestamptz,           -- last successful chain read
  last_checked_at    timestamptz,           -- last attempt, successful or not
  verify_error       text,                  -- why the last attempt failed
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (chain, network, asset_address)
);

create index nfts_asset_idx on public.nfts (network, asset_kind, asset_id);
create index nfts_collection_idx on public.nfts (network, collection_address);

create trigger nfts_touch before update on public.nfts
  for each row execute function public.touch_updated_at();

create table public.nft_ownership (
  id                    bigint generated always as identity primary key,
  nft_id                uuid not null references public.nfts (id) on delete cascade,
  owner_wallet          text not null check (owner_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  first_seen_at         timestamptz not null default now(),
  last_verified_at      timestamptz not null default now(),
  acquired_at           timestamptz,       -- block time of the acquisition tx, when known
  acquisition_source    public.nft_acquisition not null default 'unknown',
  acquisition_signature text,
  is_current            boolean not null default true,
  ended_at              timestamptz,
  ended_reason          text check (ended_reason in ('transferred', 'burned')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (is_current = (ended_at is null))
);

create unique index nft_ownership_current_idx on public.nft_ownership (nft_id) where is_current;
create index nft_ownership_history_idx on public.nft_ownership (nft_id, first_seen_at desc);
create index nft_ownership_wallet_idx on public.nft_ownership (owner_wallet) where is_current;

create trigger nft_ownership_touch before update on public.nft_ownership
  for each row execute function public.touch_updated_at();

create index purchases_asset_idx on public.purchases (network, asset_address);

-- ---------------------------------------------------------------------------
-- Writes. Called only by the edge functions (service role), each right after
-- reading the asset from the chain. Each is one transaction.
-- ---------------------------------------------------------------------------

-- Insert or refresh an NFT row; returns its id. Never overwrites a known mint
-- signature / time / metadata with nothing.
create function public.nft_register(p jsonb) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.nfts as n (
    asset_kind, asset_id, chain, network, asset_address, collection_address,
    name, metadata_uri, metadata_json, mint_signature, minted_at
  ) values (
    (p->>'asset_kind')::public.asset_kind, p->>'asset_id', coalesce(p->>'chain', 'solana'), p->>'network',
    p->>'asset_address', p->>'collection_address', p->>'name', p->>'metadata_uri', p->'metadata_json',
    p->>'mint_signature', (p->>'minted_at')::timestamptz
  )
  on conflict (chain, network, asset_address) do update set
    collection_address = excluded.collection_address,
    name               = coalesce(excluded.name, n.name),
    metadata_uri       = coalesce(excluded.metadata_uri, n.metadata_uri),
    metadata_json      = coalesce(n.metadata_json, excluded.metadata_json),
    mint_signature     = coalesce(n.mint_signature, excluded.mint_signature),
    minted_at          = coalesce(n.minted_at, excluded.minted_at)
  returning id into v_id;
  return v_id;
end;
$$;

-- Record the owner just read from the chain for one NFT.
--   same owner      → refresh last_verified_at (and fill in how they got it
--                     if that was unknown, e.g. a sync ran before the
--                     purchase was verified)
--   different owner → close the current period as "transferred", open a new one
-- A read older than the one already recorded is ignored, so a slow sync can't
-- roll ownership back over a newer purchase.
-- → { changed, previous, current, stale }
create function public.nft_record_owner(
  p_nft uuid,
  p_owner text,
  p_verified_at timestamptz,
  p_source public.nft_acquisition default 'unknown',
  p_signature text default null,
  p_acquired_at timestamptz default null
) returns jsonb
language plpgsql as $$
declare
  cur public.nft_ownership;
begin
  perform 1 from public.nfts where id = p_nft for update;
  if not found then raise exception 'nft % not found', p_nft; end if;

  select * into cur from public.nft_ownership where nft_id = p_nft and is_current;

  if cur.id is not null and cur.last_verified_at > p_verified_at then
    return jsonb_build_object('changed', false, 'stale', true, 'previous', cur.owner_wallet, 'current', cur.owner_wallet);
  end if;

  if cur.id is not null and cur.owner_wallet = p_owner then
    update public.nft_ownership set
      last_verified_at      = p_verified_at,
      acquisition_source    = case when cur.acquisition_source = 'unknown' then p_source else cur.acquisition_source end,
      acquisition_signature = case when cur.acquisition_source = 'unknown' then coalesce(p_signature, cur.acquisition_signature) else cur.acquisition_signature end,
      acquired_at           = case when cur.acquisition_source = 'unknown' then coalesce(p_acquired_at, cur.acquired_at) else cur.acquired_at end
    where id = cur.id;
  else
    if cur.id is not null then
      update public.nft_ownership set is_current = false, ended_at = p_verified_at, ended_reason = 'transferred'
      where id = cur.id;
    end if;
    insert into public.nft_ownership (
      nft_id, owner_wallet, first_seen_at, last_verified_at, acquired_at, acquisition_source, acquisition_signature
    ) values (
      p_nft, p_owner, p_verified_at, p_verified_at, p_acquired_at,
      -- A new owner after a known one, without a marketplace purchase, got it by transfer.
      case when cur.id is not null and p_source = 'unknown' then 'transfer'::public.nft_acquisition else p_source end,
      p_signature
    );
  end if;

  update public.nfts set
    status = 'owned', last_verified_at = p_verified_at, last_checked_at = now(), verify_error = null
  where id = p_nft;

  return jsonb_build_object(
    'changed', cur.id is not null and cur.owner_wallet <> p_owner,
    'stale', false,
    'previous', cur.owner_wallet,
    'current', p_owner
  );
end;
$$;

-- The asset account is gone: close the current period as "burned".
create function public.nft_record_burned(p_nft uuid, p_verified_at timestamptz) returns jsonb
language plpgsql as $$
declare
  cur public.nft_ownership;
begin
  perform 1 from public.nfts where id = p_nft for update;
  select * into cur from public.nft_ownership where nft_id = p_nft and is_current;
  if cur.id is not null then
    update public.nft_ownership set is_current = false, ended_at = p_verified_at, ended_reason = 'burned'
    where id = cur.id;
  end if;
  update public.nfts set
    status = 'burned', last_verified_at = p_verified_at, last_checked_at = now(), verify_error = null
  where id = p_nft;
  return jsonb_build_object('changed', cur.id is not null, 'stale', false, 'previous', cur.owner_wallet, 'current', null);
end;
$$;

-- A verified purchase: the purchase row, the NFT and its first owner, together.
create function public.nft_record_purchase(p_purchase jsonb, p_nft jsonb, p_owner text, p_verified_at timestamptz)
returns jsonb
language plpgsql as $$
declare
  v_id uuid;
  v_result jsonb;
begin
  insert into public.purchases (signature, network, chain, wallet, asset_kind, asset_id, asset_address, price)
  values (
    p_purchase->>'signature', p_purchase->>'network', coalesce(p_purchase->>'chain', 'solana'), p_purchase->>'wallet',
    (p_purchase->>'asset_kind')::public.asset_kind, p_purchase->>'asset_id', p_purchase->>'asset_address',
    (p_purchase->>'price')::numeric
  )
  on conflict (signature) do nothing;

  v_id := public.nft_register(p_nft);
  v_result := public.nft_record_owner(
    v_id, p_owner, p_verified_at, 'marketplace', p_purchase->>'signature', (p_nft->>'minted_at')::timestamptz
  );
  return v_result || jsonb_build_object('nft_id', v_id);
end;
$$;

revoke execute on function public.nft_register(jsonb) from public, anon, authenticated;
revoke execute on function public.nft_record_owner(uuid, text, timestamptz, public.nft_acquisition, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.nft_record_burned(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.nft_record_purchase(jsonb, jsonb, text, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Carry over the old cache: each row was a chain read at last_synced_at.
-- ---------------------------------------------------------------------------

insert into public.nfts (
  asset_kind, asset_id, chain, network, asset_address, collection_address,
  mint_signature, minted_at, status, last_verified_at, last_checked_at
)
select o.asset_kind, o.asset_id, o.chain, o.network, o.asset_address, o.collection,
       p.signature, p.verified_at, 'owned', o.last_synced_at, o.last_synced_at
from public.ownership o
left join lateral (
  select signature, verified_at from public.purchases p
  where p.network = o.network and p.asset_address = o.asset_address
  order by verified_at limit 1
) p on true
on conflict do nothing;

insert into public.nft_ownership (
  nft_id, owner_wallet, first_seen_at, last_verified_at, acquired_at, acquisition_source, acquisition_signature
)
select n.id, o.wallet, o.last_synced_at, o.last_synced_at, n.minted_at,
       case when p.wallet = o.wallet then 'marketplace'::public.nft_acquisition else 'unknown'::public.nft_acquisition end,
       case when p.wallet = o.wallet then p.signature end
from public.ownership o
join public.nfts n on n.chain = o.chain and n.network = o.network and n.asset_address = o.asset_address
left join public.purchases p on p.signature = n.mint_signature;

drop table public.ownership;

-- ---------------------------------------------------------------------------
-- RLS: public chain data, readable by anyone; writes only via the functions.
-- ---------------------------------------------------------------------------

alter table public.nfts enable row level security;
alter table public.nft_ownership enable row level security;

create policy "nfts are public" on public.nfts for select to anon, authenticated using (true);
create policy "nft ownership is public" on public.nft_ownership for select to anon, authenticated using (true);
