-- Animator wardrobe: wearables published from the Fuchey Animator together
-- with how they sit on each character, reviewed in the admin, then imported
-- into the marketplace's wearables. Same flow as the character studio
-- (20261117000000_studio.sql), beside it, and additive only.
--
--   animator "Publish wardrobe item" ──► functions/studio (startWearablePublish / finishWearablePublish)
--                                        ──► studio_wearable_* tables + studio-art bucket (_wardrobe/…)
--   admin → Animator → Wardrobe        ──► functions/admin (studioWearable* actions): review
--   admin → Wearable editor            ──► "Import from animator" builds `visual` from an approved version
--
-- A version holds the art AND its placement on every character it fits
-- (studio_wearable_fits), and is never edited after it is sent, so art and
-- fit always travel together. Rejecting a version never touches an earlier
-- approved one, and the public site only ever reads public.wearables.
--
-- No RLS policies: only the edge functions (service role) read or write these.

create table public.studio_wearables (
  id               bigint generated always as identity primary key,
  -- The animator's ids: pack folder, wardrobe slot and item, e.g. hibit / hat / tricorn.
  pack_id          text not null check (pack_id ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  slot             text not null check (slot in ('back', 'outfit', 'neck', 'headwrap', 'face', 'hat', 'front', 'special')),
  item_id          text not null check (item_id ~ '^[a-z0-9][a-z0-9_]{0,47}$'),
  pack_name        text not null check (char_length(pack_name) between 1 and 80),
  name             text not null check (char_length(name) between 1 and 80),
  latest_version   integer not null default 0,
  approved_version integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (pack_id, slot, item_id)
);

create trigger studio_wearables_touch before update on public.studio_wearables
  for each row execute function public.touch_updated_at();

create table public.studio_wearable_versions (
  id            bigint generated always as identity primary key,
  wearable      bigint not null references public.studio_wearables (id) on delete cascade,
  version       integer not null check (version > 0),
  status        public.studio_status not null default 'uploading',
  -- What the animator knew when it published: slot, item, site slot, export scale.
  info          jsonb not null default '{}' check (jsonb_typeof(info) = 'object'),
  art_check     jsonb not null default '{}' check (jsonb_typeof(art_check) = 'object'),
  submitted_by  text not null,
  submitted_at  timestamptz not null default now(),
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text check (review_note is null or char_length(review_note) <= 1000),
  unique (wearable, version)
);

-- How the item sits on one animator character, in that character's canvas pixels.
create table public.studio_wearable_fits (
  id            bigint generated always as identity primary key,
  version_id    bigint not null references public.studio_wearable_versions (id) on delete cascade,
  character_id  text not null check (character_id ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  canvas_w      integer not null check (canvas_w between 1 and 4096),
  canvas_h      integer not null check (canvas_h between 1 and 4096),
  unit          integer not null default 1 check (unit between 1 and 8),
  arms          text not null default 'front' check (arms in ('front', 'behind_head')),
  -- Raw animator placement: { offset: [x, y], box: { x, y, w, h }, group: "body" | "head",
  --   rotation, anchor: [ax, ay], scaleX, scaleY, layer: { slot, order, siteLayer, z } }
  placement     jsonb not null check (jsonb_typeof(placement) = 'object'),
  -- The same placement on the website's 96×96 grid, derived by
  -- functions/_shared/wardrobeFit.js: { x, y, scale, width, height }
  site          jsonb not null check (jsonb_typeof(site) = 'object'),
  -- Animation-specific data kept for later: companions, sleeve poses, variants.
  animation     jsonb not null default '{}' check (jsonb_typeof(animation) = 'object'),
  unique (version_id, character_id)
);

-- One row per stored file: a fit's front / back layer or its preview, or the item's icon.
create table public.studio_wearable_files (
  id           bigint generated always as identity primary key,
  version_id   bigint not null references public.studio_wearable_versions (id) on delete cascade,
  fit_id       bigint references public.studio_wearable_fits (id) on delete cascade,
  kind         text not null check (kind in ('front', 'back', 'icon', 'preview', 'gif')),
  animation    text not null default '' check (animation ~ '^[a-z0-9_-]{0,64}$'),
  scale        integer not null check (scale between 1 and 8),
  width        integer not null check (width between 1 and 4096),
  height       integer not null check (height between 1 and 4096),
  frames       integer not null default 1 check (frames >= 1),
  duration_ms  integer not null default 0 check (duration_ms >= 0),
  bytes        integer not null check (bytes > 0),
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  path         text not null,
  uploaded     boolean not null default false,
  created_at   timestamptz not null default now()
);

create unique index studio_wearable_files_one_idx
  on public.studio_wearable_files (version_id, coalesce(fit_id, 0), kind, animation, scale);
create index studio_wearable_files_sha_idx on public.studio_wearable_files (sha256);
create index studio_wearable_fits_version_idx on public.studio_wearable_fits (version_id);

alter table public.studio_wearables enable row level security;
alter table public.studio_wearable_versions enable row level security;
alter table public.studio_wearable_fits enable row level security;
alter table public.studio_wearable_files enable row level security;

-- A marketplace wearable remembers which animator version it came from:
-- { pack, slot, item, version }. Null for wearables made by hand.
alter table public.wearables add column if not exists studio jsonb
  check (studio is null or jsonb_typeof(studio) = 'object');
