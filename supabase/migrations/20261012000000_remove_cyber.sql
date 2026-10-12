-- Retire the Cyber Yeti character.
--
-- Its saved loadouts go with it (loadouts.character_id cascades). Wearables
-- keep fitting every other character they listed.

update public.wearables
  set compatible_characters = array_remove(compatible_characters, 'cyber')
  where 'cyber' = any (compatible_characters);

delete from public.characters where id = 'cyber';
