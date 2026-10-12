-- The Rhino is redrawn as a chibi (big head, short body). The Wild outfits
-- are pixel art fitted to the Yeti's tall body and can't be moved onto it,
-- so the Rhino stops wearing outfits: they come off its outfit list, its
-- wardrobe loses the outfit slot, and any saved Rhino look drops its outfit.
-- (Hats, glasses and the rest are shifted onto the new head by per-character
-- placement in each wearable's visual; see supabase/seed/wildArt.js.)

update public.wearables
  set compatible_characters = array_remove(compatible_characters, 'rhino')
  where type = 'outfit' and 'rhino' = any (compatible_characters);

update public.characters
  set wardrobe_slots = array_remove(wardrobe_slots, 'outfit'::public.wearable_slot)
  where id = 'rhino';

update public.loadouts
  set slots = slots - 'outfit'
  where character_id = 'rhino' and slots ? 'outfit';
