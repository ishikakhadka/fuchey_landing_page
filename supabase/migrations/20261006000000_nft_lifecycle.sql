-- NFT lifecycle, listings, ownership index and purchases.
--
-- Layers, kept apart (see supabase/README.md):
--   asset      characters / wearables rows: what a Fuchey thing *is*
--   nft        characters.nft / wearables.nft: its on-chain representation,
--              per network: { [network]: { chain, standard, status, … } }
--   listing    public.listings: whether it's on sale right now, at what price
--   ownership  public.ownership: cache of who holds which minted asset; the
--              chain stays the source of truth
--   purchase   public.purchases: verified purchase transactions
-- No wallet *provider* (Solflare, Phantom, …) is stored anywhere — only
-- wallet addresses.
--
-- Edition model: mint on purchase. "Minting" a product deploys its Metaplex
-- Core collection + Core Candy Machine; every purchase mints a new asset in
-- that collection to the buyer. minted / remaining come from the candy machine.

-- NFT artwork for characters (wearables already have image_url). This is the
-- image that goes into the NFT metadata, distinct from the layers the renderer
-- draws on the character.
alter table public.characters add column image_url text;

-- Only the NFT actions of the admin function and the deploy script write `nft`;
-- admin saves of the asset itself never touch it (see functions/admin).
comment on column public.characters.nft is
  'Per network: { chain, standard, status, collectionGroup, imageUri, metadataUri, metadataUrl, collection, candyMachine, candyGuard, authority, treasury, mintLimitId, transactions, deployedAt, error }';
comment on column public.wearables.nft is
  'Per network: { chain, standard, status, collectionGroup, imageUri, metadataUri, metadataUrl, collection, candyMachine, candyGuard, authority, treasury, mintLimitId, transactions, deployedAt, error }';

create type public.asset_kind as enum ('character', 'wearable');
create type public.sale_status as enum ('draft', 'active', 'paused', 'ended');

-- ---------------------------------------------------------------------------
-- Listings: the sale state of one deployed product on one network. Written
-- only after the candy guard on-chain has been verified to match, so the
-- marketplace never shows "on sale" for something the chain won't sell.
-- ---------------------------------------------------------------------------

create table public.listings (
  asset_kind       public.asset_kind not null,
  asset_id         text not null,
  network          text not null check (network in ('devnet', 'mainnet-beta')),
  chain            text not null default 'solana',
  status           public.sale_status not null default 'draft',
  price            numeric(12, 4) not null check (price >= 0),
  currency         text not null default 'SOL',
  quantity         integer not null check (quantity > 0),  -- edition size
  limit_per_wallet integer check (limit_per_wallet > 0),
  seller_wallet    text not null,                          -- treasury receiving payments
  candy_machine    text not null,
  starts_at        timestamptz,
  ends_at          timestamptz,
  last_signature   text,                                   -- tx that set this state on-chain
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (asset_kind, asset_id, network)
);

create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Ownership index: refreshed from the chain by functions/inventory and by
-- verified purchases. A cache for fast queries — never authoritative.
-- ---------------------------------------------------------------------------

create table public.ownership (
  network        text not null,
  asset_address  text not null,            -- the Core asset (one minted copy)
  chain          text not null default 'solana',
  wallet         text not null,
  asset_kind     public.asset_kind not null,
  asset_id       text not null,
  collection     text not null,
  last_synced_at timestamptz not null default now(),
  primary key (network, asset_address)
);

create index ownership_wallet_idx on public.ownership (network, wallet);

-- ---------------------------------------------------------------------------
-- Purchases, recorded only after the transaction is confirmed on-chain and
-- verified server-side (functions/purchase-verify).
-- ---------------------------------------------------------------------------

create table public.purchases (
  signature     text primary key,
  network       text not null,
  chain         text not null default 'solana',
  wallet        text not null,
  asset_kind    public.asset_kind not null,
  asset_id      text not null,
  asset_address text not null,
  price         numeric(12, 4),
  verified_at   timestamptz not null default now()
);

create index purchases_wallet_idx on public.purchases (network, wallet);

-- ---------------------------------------------------------------------------
-- RLS: everything here mirrors public chain data, so it's readable; all
-- writes go through the edge functions (service role).
-- ---------------------------------------------------------------------------

alter table public.listings enable row level security;
alter table public.ownership enable row level security;
alter table public.purchases enable row level security;

create policy "listings are public" on public.listings for select to anon, authenticated using (true);
create policy "ownership is public" on public.ownership for select to anon, authenticated using (true);
create policy "purchases are public" on public.purchases for select to anon, authenticated using (true);
