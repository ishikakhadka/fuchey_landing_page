-- Packs become the parent of characters and wearables.
--
-- A pack row says whether the pack is published; its characters and
-- wearables only show while both they and their pack are published, and so
-- does a drop for the pack. Unpublishing a pack in the admin also
-- unpublishes every character and wearable in it. Display text can be
-- edited here; left empty, the site uses the built-in text in
-- src/data/packs.js.

create table public.packs (
  id                    text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  name                  text not null check (char_length(name) between 1 and 80),
  tagline               text,
  description           text,
  wardrobe_tagline      text,
  wardrobe_description  text,
  backdrop_url          text,
  published             boolean not null default true,
  sort_order            integer not null default 0,
  updated_at            timestamptz not null default now()
);

insert into public.packs (id, name, sort_order) values
  ('wild', 'Wild Pack', 0),
  ('pirates', 'Pirate Pack', 1),
  ('tribal', 'Tribal Pack', 2),
  ('rogues', 'Rogues Pack', 3),
  ('cartoon', 'Cartoon Pack', 4),
  ('anime', 'Anime Pack', 5),
  ('myths', 'Myths Reimagined', 6),
  ('legends', 'Legends Reimagined', 7),
  ('heroes', 'Superheroes Reimagined', 8),
  ('brainrot', 'Brainrot Pack', 9)
on conflict (id) do nothing;

-- Any pack an existing row already names (keeps the foreign keys valid).
insert into public.packs (id, name, sort_order)
select distinct pack, initcap(pack) || ' Pack', 100
from (select pack from public.characters union select pack from public.wearables) used
on conflict (id) do nothing;

alter table public.characters
  add constraint characters_pack_fkey foreign key (pack) references public.packs (id) on update cascade;
alter table public.wearables
  add constraint wearables_pack_fkey foreign key (pack) references public.packs (id) on update cascade;

alter table public.packs enable row level security;

create policy "published packs are public" on public.packs
  for select to anon, authenticated using (published);

-- Children follow their parent pack.
drop policy "published characters are public" on public.characters;
create policy "published characters are public" on public.characters
  for select to anon, authenticated
  using (published and exists (select 1 from public.packs p where p.id = characters.pack and p.published));

drop policy "published wearables are public" on public.wearables;
create policy "published wearables are public" on public.wearables
  for select to anon, authenticated
  using (published and exists (select 1 from public.packs p where p.id = wearables.pack and p.published));

drop policy "live drops are public" on public.drops;
create policy "live drops are public" on public.drops
  for select to anon, authenticated
  using (live and exists (select 1 from public.packs p where p.id = drops.pack and p.published));
