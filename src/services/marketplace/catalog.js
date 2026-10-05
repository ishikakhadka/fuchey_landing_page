import { RARITIES, WEARABLE_TYPES } from "../../data/taxonomy";
import { NETWORK } from "../../config/network";
import { select } from "../backend/client";
import { rowToCharacter, rowToSale, rowToWearable } from "../backend/mappers";

// Read access to the marketplace catalogue, from the Supabase database
// (published rows only — drafts are visible in the admin dashboard alone).
// Components get it through CatalogContext, never by calling this directly.

// Each item gets `sale`: its listing on this network (only ever written after
// the candy guard on-chain was verified to match), or null if it isn't
// deployed / listed here. What can be bought is decided by `sale`, never by
// the catalogue's own status field.
export async function fetchCatalog() {
  const [characters, wearables, listings] = await Promise.all([
    select("characters", { order: "sort_order.asc,id.asc" }),
    select("wearables", { order: "sort_order.asc,id.asc" }),
    select("listings", { network: `eq.${NETWORK.id}` }),
  ]);
  const sales = new Map(listings.map((l) => [`${l.asset_kind}:${l.asset_id}`, rowToSale(l)]));
  const withSale = (kind) => (item) => {
    const sale = sales.get(`${kind}:${item.id}`) ?? null;
    // Shown price / limit follow the live sale once there is one.
    const listing = sale ? { ...item.listing, price: sale.price, limitPerWallet: sale.limitPerWallet } : item.listing;
    return { ...item, listing, sale };
  };
  return {
    characters: characters.map(rowToCharacter).map(withSale("character")),
    wearables: wearables.map(rowToWearable).map(withSale("wearable")),
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
