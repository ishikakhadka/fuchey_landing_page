-- Wardrobe colour variants: one wardrobe element (a Bandana, a Mask) in
-- several colours. Additive only; existing wearables keep working unchanged.
--
--   wearable_groups      the parent: its label ("Bandana"), pack and slot
--   wearables.group_id   a wearable that is one variant of a group, with its
--   wearables.variant_label / variant_order   own label ("Red") and position
--
-- Every variant stays a full wearable row: its own art, placement,
-- compatible characters, listing, NFT, published flag and animator version.
-- A group approves nothing: the site shows a variant only while that variant
-- itself is published (and, when it came from the animator, approved).
--
-- The animator side records the grouping it published with
-- (studio_wearables.group_*), so the admin can review variants together and
-- the Wearable editor's import can link them without retyping.

create table public.wearable_groups (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name        text not null check (char_length(name) between 1 and 60),
  pack        text not null references public.packs (id) on update cascade,
  type        public.wearable_slot not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger wearable_groups_touch before update on public.wearable_groups
  for each row execute function public.touch_updated_at();

alter table public.wearable_groups enable row level security;
-- Only a label and a pack: readable by anyone, like the published catalogue.
create policy "wearable groups are public" on public.wearable_groups
  for select to anon, authenticated using (true);

alter table public.wearables
  add column if not exists group_id text references public.wearable_groups (id) on update cascade on delete set null,
  add column if not exists variant_label text check (variant_label is null or char_length(variant_label) between 1 and 40),
  add column if not exists variant_order integer not null default 0;

create index if not exists wearables_group_idx on public.wearables (group_id);

-- Animator grouping, as published: { key, label, variant, isDefault } flattened.
alter table public.studio_wearables
  add column if not exists group_key text check (group_key is null or group_key ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  add column if not exists group_label text check (group_label is null or char_length(group_label) between 1 and 60),
  add column if not exists variant_label text check (variant_label is null or char_length(variant_label) between 1 and 40),
  add column if not exists variant_default boolean not null default false;
