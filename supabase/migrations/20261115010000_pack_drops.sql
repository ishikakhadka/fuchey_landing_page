-- A drop for every other pack, ready to go but switched off.
--
-- Each one has its pack's built-in backdrop scene (public/backdrops/<pack>.svg),
-- hero copy taken from the pack's own tagline and description
-- (src/data/packs.js), and its characters in the capsule, rarest in front.
-- They also get a hero slide each, so turning a drop's Live switch on in
-- /admin → Drops is all it takes to show it. Nothing here is live.

insert into public.drops
  (id, pack, title, label, headline, headline_accent, tagline, description, character_ids, live, sort_order)
values
  ('wild-pack', 'wild', 'Wild Pack Drop', 'Coming Soon', 'Where every Fuchey', 'started.',
   'Where every Fuchey started.',
   'Creatures of the glacier and the grassland — the original Fuchey companions and the big beasts still on the trail.',
   array['yeti', 'rhino'], false, 1),
  ('tribal-pack', 'tribal', 'Tribal Pack Drop', 'Coming Soon', 'Masks, feathers', 'and old magic.',
   'Masks, feathers and old magic.',
   'Warriors and mystics from the deep jungle, guarding trails that don’t show up on any map.',
   array['warrior', 'shaman'], false, 2),
  ('rogues-pack', 'rogues', 'Rogues Pack Drop', 'Coming Soon', 'Light fingers,', 'loyal hearts.',
   'Light fingers, loyal hearts.',
   'Goblins and bandits who’d pick any pocket — except yours. Once they’re in your wallet, they guard it.',
   array['goblin', 'bandit'], false, 3),
  ('cartoon-pack', 'cartoon', 'Cartoon Pack Drop', 'Coming Soon', 'Saturday-morning', 'friends.',
   'Saturday-morning friends.',
   'Round, bouncy and hand-drawn smooth: a pup, a bunny, a penguin and a little robot who all live on the same funny-pages street.',
   array['biscuit', 'bolt', 'mochi', 'pip'], false, 4),
  ('anime-pack', 'anime', 'Anime Pack Drop', 'Coming Soon', 'Big eyes,', 'bigger destinies.',
   'Big eyes, bigger destinies.',
   'Heroes and spirits straight out of a Saturday-night anime: a spiky-haired fighter, a magical girl, a silent swordsman and a fox who keeps a shrine.',
   array['kaito', 'miko', 'hana', 'ren'], false, 5),
  ('myths-pack', 'myths', 'Myths Reimagined Drop', 'Coming Soon', 'Old gods,', 'new wallets.',
   'Old gods, new wallets.',
   'Figures from the oldest stories, redrawn small and friendly: a jackal guide of the underworld, a gorgon with a nest of snakes, a monkey who defied heaven and a bull from the labyrinth.',
   array['anubis', 'monkey-king', 'medusa', 'minotaur'], false, 6),
  ('legends-pack', 'legends', 'Legends Reimagined Drop', 'Coming Soon', 'Tales told', 'after dark.',
   'Tales told after dark.',
   'Folklore and fireside stories made pocket-sized: a count who only comes out at night, an outlaw archer of the greenwood, a wizard of the old court and a detective who follows every scent.',
   array['nocturne', 'merlin', 'rowan', 'hound'], false, 7),
  ('heroes-pack', 'heroes', 'Superheroes Reimagined Drop', 'Coming Soon', 'Capes on.', 'Wallets safe.',
   'Capes on. Wallets safe.',
   'An all-new squad of Fuchey heroes: a speedster who outruns block times, a flier with cloud hair, an armoured pangolin and an owl who keeps watch all night.',
   array['zippa', 'umbra', 'pango', 'nimbus'], false, 8),
  ('brainrot-pack', 'brainrot', 'Brainrot Pack Drop', 'Coming Soon', 'Absolutely no thoughts.', 'Only vibes.',
   'Absolutely no thoughts. Only vibes.',
   'Unhinged mash-up creatures with names you can’t stop saying: a toaster frog, an ice-cream owl, a washing-machine cat and a tomato penguin.',
   array['toastolino', 'lavatrice', 'gelatino', 'pomodoro'], false, 9)
on conflict (id) do nothing;

-- Only reference characters that exist in this database (a fresh project may
-- not have every pack seeded yet).
update public.drops d
set character_ids = array(select x from unnest(d.character_ids) x where exists (select 1 from public.characters c where c.id = x))
where d.id like '%-pack';

insert into public.home_slides (id, kind, drop_id, enabled, sort_order)
select d.id, 'drop', d.id, true, 10 + d.sort_order
from public.drops d
where d.id in ('wild-pack', 'tribal-pack', 'rogues-pack', 'cartoon-pack', 'anime-pack', 'myths-pack', 'legends-pack', 'heroes-pack', 'brainrot-pack')
on conflict (id) do nothing;
