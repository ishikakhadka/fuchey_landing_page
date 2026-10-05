import { RARITIES, WEARABLE_TYPES } from "../../data/taxonomy";
import { select } from "../backend/client";
import { rowToCharacter, rowToWearable } from "../backend/mappers";

// Read access to the marketplace catalogue, from the Supabase database
// (published rows only — drafts are visible in the admin dashboard alone).
// Components get it through CatalogContext, never by calling this directly.

export async function fetchCatalog() {
  const [characters, wearables] = await Promise.all([
    select("characters", { order: "sort_order.asc,id.asc" }),
    select("wearables", { order: "sort_order.asc,id.asc" }),
  ]);
  return {
    characters: characters.map(rowToCharacter),
    wearables: wearables.map(rowToWearable),
  };
}

export function getWearableTypes() {
  return WEARABLE_TYPES;
}

export function getRarity(id) {
  return RARITIES[id] ?? RARITIES.common;
}

// Whether a wearable can be equipped on a character.
export function fitsCharacter(wearable, characterId) {
  return Boolean(characterId && wearable?.compatibleCharacters?.includes(characterId));
}
