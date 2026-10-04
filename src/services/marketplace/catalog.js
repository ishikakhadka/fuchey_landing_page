import { characters } from "../../data/characters";
import { wearables } from "../../data/wearables";
import { RARITIES, WEARABLE_TYPES } from "../../data/taxonomy";

// Read access to the marketplace catalogue.
//
// Everything is async on purpose: today it reads the static files in data/,
// later (Phase 6) it will call the marketplace backend for listings, live
// supply and claim limits. Components and hooks never import data/ directly.

export async function getCharacters() {
  return characters;
}

export async function getCharacter(id) {
  return characters.find((item) => item.id === id) ?? null;
}

export async function getWearables({ type } = {}) {
  return type ? wearables.filter((item) => item.type === type) : wearables;
}

export async function getWearablesFor(characterId) {
  return wearables.filter((item) => item.compatibleCharacters.includes(characterId));
}

export function getWearableTypes() {
  return WEARABLE_TYPES;
}

export function getRarity(id) {
  return RARITIES[id] ?? RARITIES.common;
}

export function getCharacterName(id) {
  return characters.find((item) => item.id === id)?.name ?? id;
}

// Synchronous lookup of any catalogue item (character or wearable) by id.
export function findItem(id) {
  const character = characters.find((item) => item.id === id);
  if (character) return { ...character, kind: "character" };
  const wearable = wearables.find((item) => item.id === id);
  return wearable ? { ...wearable, kind: "wearable" } : null;
}
