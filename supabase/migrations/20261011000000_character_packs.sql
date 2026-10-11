-- Character and wardrobe packs.
--
-- The Characters page groups characters into packs (Wild, Pirates, …); a
-- visitor picks a pack first, then browses the characters in it. Pack
-- metadata (name, blurb) lives with the site in src/data/packs.js; each
-- character only names its pack. Every existing character is a Wild one.
--
-- The wardrobe is grouped the same way: each wearable names the pack it
-- belongs to (what it's themed on), separately from the characters it fits.

alter table public.characters
  add column pack text not null default 'wild' check (pack ~ '^[a-z0-9][a-z0-9-]{1,31}$');

create index characters_pack_idx on public.characters (pack, sort_order);

alter table public.wearables
  add column pack text not null default 'wild' check (pack ~ '^[a-z0-9][a-z0-9-]{1,31}$');

create index wearables_pack_idx on public.wearables (pack, sort_order);
