import { RARITIES, WEARABLE_TYPES } from "../../data/taxonomy";
import { NETWORK } from "../../config/network";
import { select } from "../backend/client";
import { rowToCharacter, rowToSale, rowToWearable } from "../backend/mappers";
import { applyPackRows } from "../../data/packs";

// Read access to the marketplace catalogue, from the Supabase database
// (published rows only — drafts are visible in the admin dashboard alone).
// Components get it through CatalogContext, never by calling this directly.

// Each item gets `sale`: its listing on this network (only ever written after
// the candy guard on-chain was verified to match), or null if it isn't
// deployed / listed here. What can be bought is decided by `sale`, never by
// the catalogue's own status field.
export async function fetchCatalog() {
  const [characters, wearables, listings, packRows] = await Promise.all([
    select("characters", { order: "sort_order.asc,id.asc" }),
    select("wearables", { order: "sort_order.asc,id.asc" }),
    select("listings", { network: `eq.${NETWORK.id}` }),
    // Published packs only (RLS); a backend without the table yet keeps the built-ins.
    select("packs", { order: "sort_order.asc,id.asc" }).catch(() => []),
  ]);
  applyPackRows(packRows);
  const sales = new Map(listings.map((l) => [`${l.asset_kind}:${l.asset_id}`, rowToSale(l)]));
  const withSale = (kind) => (item) => {
    const sale = sales.get(`${kind}:${item.id}`) ?? null;
    // Shown price / limit follow the live sale once there is one. A USD price
    // stays the headline; `solPrice` is what the sale actually charges.
    const usd = item.listing.currency === "usd";
    const listing = sale
      ? { ...item.listing, price: usd ? item.listing.price : sale.price, solPrice: sale.price, limitPerWallet: sale.limitPerWallet }
      : { ...item.listing, solPrice: usd ? null : item.listing.price };
    // "Show the NFT artwork on the site": the picture everywhere except the
    // dressing room, which keeps the base art wearables line up with.
    // A website picture (e.g. an animated GIF) wins over the NFT artwork.
    const display = item.displayUrl || (item.showNftArt ? item.imageUrl : null);
    const art = display && !item.art.locked ? { ...item.art, displayImage: display } : item.art;
    return { ...item, art, listing, sale };
  };
  return {
    characters: characters.map(rowToCharacter).map(withSale("character")),
    wearables: wearables.map(rowToWearable).map(withSale("wearable")),
  };
}

export function getWearableTypes() {
  return WEARABLE_TYPES;
}

// One wearable's type as a singular label ("Hat", "Accessory").
export function getWearableTypeLabel(id) {
  const label = WEARABLE_TYPES.find((t) => t.id === id)?.label;
  return label ? label.replace(/ies$/, "y").replace(/s$/, "") : "Wearable";
}

export function getRarity(id) {
  return RARITIES[id] ?? RARITIES.common;
}

// Whether a character can wear things: base art on the 96×96 grid, or an
// unlocked pixel sprite (scaled onto that grid) or vector art with wardrobe
// slots. Mirrored by the loadout function.
export function isDressable(character) {
  const art = character?.art;
  if (art?.kind === "character") return true;
  return (art?.kind === "sprite" || art?.kind === "vector") && !art.locked && Boolean(character.wardrobeSlots?.length);
}

// Whether a wearable can be equipped on a character.
export function fitsCharacter(wearable, characterId) {
  return Boolean(characterId && wearable?.compatibleCharacters?.includes(characterId));
}
