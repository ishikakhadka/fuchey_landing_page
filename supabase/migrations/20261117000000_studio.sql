-- Animator studio: characters published from the Fuchey Animator, reviewed in
-- the admin, then imported into the marketplace catalogue.
--
--   animator "Publish to Fuchey" ──► functions/studio ──► studio_* tables + studio-art bucket
--   admin → Animator tab          ──► functions/admin (studio* actions): review
--   admin → Character editor      ──► "Import from animator" fills the form from an approved version
--
-- Every publish is a new, numbered version of (pack, character). Versions are
-- never edited after they're sent, so a marketplace item always points at
-- exactly the art that was approved. The GIF files live in storage; these
-- tables keep one small row per file (what it is, its size and where it is).
--
-- No RLS policies: only the edge functions (service role) read or write these.

-- Who may sign in to the animator. Admins (public.admins) always may.
create table public.studio_members (
  wallet     text primary key check (wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  note       text,
  added_by   text,
  created_at timestamptz not null default now()
);

create table public.studio_characters (
  id               bigint generated always as identity primary key,
  -- The animator's own ids (its folder names), e.g. rogues / new_bandit.
  pack_id          text not null check (pack_id ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  character_id     text not null check (character_id ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  pack_name        text not null check (char_length(pack_name) between 1 and 80),
  name             text not null check (char_length(name) between 1 and 80),
  body_type        text,
  latest_version   integer not null default 0,
  approved_version integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (pack_id, character_id)
);

create trigger studio_characters_touch before update on public.studio_characters
  for each row execute function public.touch_updated_at();

create type public.studio_status as enum ('uploading', 'in_review', 'approved', 'rejected');

create table public.studio_versions (
  id            bigint generated always as identity primary key,
  character     bigint not null references public.studio_characters (id) on delete cascade,
  version       integer not null check (version > 0),
  status        public.studio_status not null default 'uploading',
  -- What the animator knew when it published: canvas, poses, moods, wearables.
  info          jsonb not null default '{}' check (jsonb_typeof(info) = 'object'),
  -- The animations themselves (keyframes), by key: { idle: { label, mood, frames: [...] }, … }
  animations    jsonb not null default '{}' check (jsonb_typeof(animations) = 'object'),
  -- Art-check counts at publish time: { errors, warnings }
  art_check     jsonb not null default '{}' check (jsonb_typeof(art_check) = 'object'),
  submitted_by  text not null,
  submitted_at  timestamptz not null default now(),
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text check (review_note is null or char_length(review_note) <= 1000),
  unique (character, version)
);

-- One row per stored file: a GIF of one animation at one size, or the still preview.
create table public.studio_renders (
  id           bigint generated always as identity primary key,
  version_id   bigint not null references public.studio_versions (id) on delete cascade,
  kind         text not null check (kind in ('gif', 'preview')),
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
  created_at   timestamptz not null default now(),
  unique (version_id, kind, animation, scale)
);

create index studio_renders_sha_idx on public.studio_renders (sha256);

alter table public.studio_members enable row level security;
alter table public.studio_characters enable row level security;
alter table public.studio_versions enable row level security;
alter table public.studio_renders enable row level security;

-- A marketplace character remembers which animator version it came from:
-- { pack, character, version }. Null for characters made by hand.
alter table public.characters add column if not exists studio jsonb
  check (studio is null or jsonb_typeof(studio) = 'object');

-- Rendered art. Public read so an approved GIF can be used on the site as is.
-- Every file name ends in a hash of its content, and anonymous listing is not
-- allowed, so unreviewed art can only be reached by someone given its link.
-- Uploads only through signed upload links from functions/studio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-art', 'studio-art', true, 20971520, array['image/png', 'image/gif'])
on conflict (id) do nothing;
