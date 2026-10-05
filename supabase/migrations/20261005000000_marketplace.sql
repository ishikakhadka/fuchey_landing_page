-- Fuchey marketplace catalogue, loadouts and admin allowlist.
--
-- The public site reads published rows straight from PostgREST with the anon
-- key. Every write goes through the edge functions (supabase/functions/),
-- which verify a wallet signature and use the service role — so there are no
-- insert/update policies here at all.
--
-- Three things are deliberately kept apart:
--   listing  (status, price, supply, limit_per_wallet) → marketplace config
--   nft      ({ [network]: { collection, candyMachine, … } }) → on-chain refs
--   visual   (layers + placement on the character grid) → what the renderer draws
-- Owning an NFT is read from Solana; wearing one is a loadout row. Neither
-- touches the other.

create type public.rarity as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');
create type public.listing_status as enum ('available', 'coming-soon', 'sold-out');
-- Wardrobe slots: one item per slot. The renderer stacks them in this order
-- (see src/data/taxonomy.js SLOT_ORDER), not in enum order.
create type public.wearable_slot as enum ('hat', 'headwear', 'outfit', 'accessory', 'backpack', 'held', 'special');

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------------

create table public.characters (
  id               text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name             text not null check (length(name) between 1 and 60),
  title            text not null check (length(title) between 1 and 80),
  tagline          text not null default '',
  quote            text not null default '',
  description      text not null default '',
  edition          text not null default 'companion' check (edition in ('companion', 'dev')),
  edition_label    text not null default '',
  rarity           public.rarity not null default 'common',
  -- { kind: "character", image: "yeti" | "<url>" }  base art on the 96×96 grid
  -- { kind: "sprite", sprite: { palette, rows }, locked }  placeholder art
  art              jsonb not null check (art ? 'kind'),
  attributes       jsonb not null default '[]' check (jsonb_typeof(attributes) = 'array'),
  wardrobe_slots   public.wearable_slot[] not null default '{}',

  status           public.listing_status not null default 'coming-soon',
  price            numeric(12, 4) check (price >= 0),
  supply           integer check (supply > 0),
  limit_per_wallet integer check (limit_per_wallet > 0),

  nft              jsonb not null default '{}' check (jsonb_typeof(nft) = 'object'),

  published        boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Wearables
-- ---------------------------------------------------------------------------

create table public.wearables (
  id                    text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name                  text not null check (length(name) between 1 and 60),
  description           text not null default '',
  type                  public.wearable_slot not null,
  rarity                public.rarity not null default 'common',
  compatible_characters text[] not null default '{}',

  status                public.listing_status not null default 'coming-soon',
  price                 numeric(12, 4) check (price >= 0),
  supply                integer check (supply > 0),
  limit_per_wallet      integer check (limit_per_wallet > 0),

  -- NFT image (marketplace / metadata). Not what the renderer layers on the
  -- character — that's `visual`.
  image_url             text,
  nft                   jsonb not null default '{}' check (jsonb_typeof(nft) = 'object'),

  -- How the wearable is drawn on a character, on the base art's 96×96 grid:
  --   kind "runs":  { front, back?, icon?, bounds }  pixel runs [{x,y,w,c}]
  --   kind "image": { image, backImage?, width, height, x, y, scale }
  -- plus { layer, z } for stacking and perCharacter: { [id]: overrides }.
  visual                jsonb not null check (visual ? 'kind'),

  published             boolean not null default false,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index wearables_type_idx on public.wearables (type);
create index wearables_compatible_idx on public.wearables using gin (compatible_characters);

create trigger wearables_touch before update on public.wearables
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Loadouts: what a wallet has equipped on a character. References wearable
-- ids only; the wearables themselves (and the NFTs) are never copied or moved.
-- ---------------------------------------------------------------------------

create table public.loadouts (
  wallet       text not null check (wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  character_id text not null references public.characters (id) on delete cascade,
  -- { [slot]: wearableId }
  slots        jsonb not null default '{}' check (jsonb_typeof(slots) = 'object'),
  updated_at   timestamptz not null default now(),
  primary key (wallet, character_id)
);

create trigger loadouts_touch before update on public.loadouts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Admin allowlist (wallet addresses). Read only by the edge functions.
-- ---------------------------------------------------------------------------

create table public.admins (
  wallet     text primary key check (wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  note       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.characters enable row level security;
alter table public.wearables enable row level security;
alter table public.loadouts enable row level security;
alter table public.admins enable row level security;

create policy "published characters are public" on public.characters
  for select to anon, authenticated using (published);

create policy "published wearables are public" on public.wearables
  for select to anon, authenticated using (published);

-- Loadouts only name public catalogue items, so they're readable by anyone
-- (like the NFTs themselves).
create policy "loadouts are public" on public.loadouts
  for select to anon, authenticated using (true);

-- admins: no policies → invisible to anon/authenticated.

-- ---------------------------------------------------------------------------
-- Storage for uploaded art (wearable layers, NFT images, character bases).
-- Public read; uploads only through the admin function.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-art', 'catalog-art', true, 2097152, array['image/png', 'image/webp'])
on conflict (id) do nothing;
