-- Admin-controlled home page content: pack drops, the home hero carousel and
-- home page settings.
--
-- Like the catalogue, the public site reads these straight from PostgREST with
-- the anon key (only what's switched on), and every write goes through the
-- admin edge function (wallet sign-in + allowlist, service role). No insert or
-- update policies.
--
--   drops        one pack drop: banner copy, backdrop, the characters sealed
--                in its capsule, its window (starts_at / ends_at), a live
--                switch and where it shows (hero, upcoming drops, banner).
--   home_slides  the hero carousel, in order: a drop slide (everything comes
--                from its drop), the scratch card, or a custom slide.
--   site_settings key/value settings; "home" holds autoplay timing and which
--                home sections are shown.
--
-- Drop dates only drive what the site shows (countdown, "Ends in…", hiding an
-- ended drop). Sales still open from the on-chain listing.

-- ---------------------------------------------------------------------------
-- Drops
-- ---------------------------------------------------------------------------

create table public.drops (
  id             text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  pack           text not null check (pack ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  title          text not null check (length(title) between 1 and 80),
  label          text not null default '' check (length(label) <= 40),
  headline       text not null default '' check (length(headline) <= 80),
  headline_accent text not null default '' check (length(headline_accent) <= 80),
  tagline        text not null default '' check (length(tagline) <= 160),
  description    text not null default '' check (length(description) <= 600),
  -- Scene behind the banner and the hero slide. Null = the pack's built-in
  -- backdrop (public/backdrops/<pack>.svg).
  backdrop_url   text,
  -- Characters sealed in the capsule / shown on the banner, in order.
  character_ids  text[] not null default '{}',
  starts_at      timestamptz,
  ends_at        timestamptz check (ends_at is null or starts_at is null or ends_at > starts_at),
  -- The master switch: nothing shows unless this is on.
  live           boolean not null default false,
  show_in_hero     boolean not null default true,
  show_in_upcoming boolean not null default true,
  show_banner      boolean not null default true,
  cta_label      text not null default '' check (length(cta_label) <= 40),
  cta_href       text not null default '' check (length(cta_href) <= 200),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index drops_live_idx on public.drops (live, sort_order);

create trigger drops_touch before update on public.drops
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Home hero slides
-- ---------------------------------------------------------------------------

create table public.home_slides (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  kind        text not null check (kind in ('drop', 'scratch', 'custom')),
  drop_id     text references public.drops (id) on delete cascade,
  -- Custom slides (and optional overrides for the scratch slide).
  eyebrow     text not null default '' check (length(eyebrow) <= 60),
  title       text not null default '' check (length(title) <= 80),
  title_accent text not null default '' check (length(title_accent) <= 80),
  body        text not null default '' check (length(body) <= 400),
  image_url   text,
  cta_label   text not null default '' check (length(cta_label) <= 40),
  cta_href    text not null default '' check (length(cta_href) <= 200),
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind <> 'drop' or drop_id is not null)
);

create index home_slides_order_idx on public.home_slides (enabled, sort_order);

create trigger home_slides_touch before update on public.home_slides
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Site settings (small JSON documents by key)
-- ---------------------------------------------------------------------------

create table public.site_settings (
  key        text primary key check (key ~ '^[a-z][a-z0-9-]{1,31}$'),
  value      jsonb not null default '{}' check (jsonb_typeof(value) = 'object'),
  updated_at timestamptz not null default now()
);

create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: the public sees what's switched on, nothing else.
-- ---------------------------------------------------------------------------

alter table public.drops enable row level security;
alter table public.home_slides enable row level security;
alter table public.site_settings enable row level security;

create policy "live drops are public" on public.drops
  for select to anon, authenticated using (live);
create policy "enabled home slides are public" on public.home_slides
  for select to anon, authenticated using (enabled);
create policy "site settings are public" on public.site_settings
  for select to anon, authenticated using (true);

grant select on public.drops, public.home_slides, public.site_settings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Starting content: the Pirate Pack drop in the hero next to the scratch card,
-- and every home section switched on. Edit all of it from /admin.
-- ---------------------------------------------------------------------------

insert into public.drops (id, pack, title, label, headline, headline_accent, tagline, description, character_ids, live, sort_order)
values (
  'pirate-pack', 'pirates', 'Pirate Pack Drop', 'Limited Time', 'Something’s on', 'the horizon.',
  'Salt, gold and a little curse.',
  'A captain who never lost a wager, a deckhand with too many arms and a crewmate who wouldn’t stay buried. The Pirate crew sets sail soon.',
  array['squidman', 'captain', 'zombie-pirate'], true, 0
) on conflict (id) do nothing;

insert into public.home_slides (id, kind, drop_id, sort_order) values
  ('pirate-pack', 'drop', 'pirate-pack', 0),
  ('scratch', 'scratch', null, 1)
on conflict (id) do nothing;

insert into public.site_settings (key, value) values (
  'home',
  '{"autoplaySeconds": 7, "sections": {"stats": true, "parade": true, "reveal": true, "howItWorks": true, "upcoming": true, "onSale": true, "completeTheLook": true, "companion": true, "waitlist": true}}'
) on conflict (key) do nothing;
