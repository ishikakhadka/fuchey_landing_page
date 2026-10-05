// Database rows ⇄ the item shape the components have always used, so the
// marketplace UI and renderer didn't have to change when the data moved:
//
//   character: { id, name, title, …, art, wardrobeSlots, listing: { status, price, supply, limitPerWallet }, nft }
//   wearable:  { id, name, type, …, art: { kind: "wearable" }, compatibleCharacters, listing, visual, nft }
//
// `nft` is keyed by network: { devnet: { collection, candyMachine, … } }.

const n = (v) => (v == null ? null : Number(v));

const listingFrom = (r) => ({
  status: r.status,
  price: n(r.price),
  supply: n(r.supply),
  limitPerWallet: n(r.limit_per_wallet),
});

const listingTo = (listing = {}) => ({
  status: listing.status ?? "coming-soon",
  price: listing.price ?? null,
  supply: listing.supply ?? null,
  limit_per_wallet: listing.limitPerWallet ?? null,
});

// A listing (public.listings) → { status: draft|active|paused|ended, price, … }.
export function rowToSale(r) {
  return {
    status: r.status,
    price: n(r.price),
    currency: r.currency,
    quantity: n(r.quantity),
    limitPerWallet: n(r.limit_per_wallet),
    sellerWallet: r.seller_wallet,
    candyMachine: r.candy_machine,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  };
}

export function rowToCharacter(r) {
  return {
    id: r.id,
    name: r.name,
    title: r.title,
    tagline: r.tagline,
    quote: r.quote,
    description: r.description,
    edition: r.edition,
    editionLabel: r.edition_label,
    rarity: r.rarity,
    art: r.art,
    attributes: r.attributes ?? [],
    wardrobeSlots: r.wardrobe_slots ?? [],
    listing: listingFrom(r),
    imageUrl: r.image_url,
    nft: r.nft ?? {},
    published: r.published,
    sortOrder: r.sort_order,
  };
}

export function characterToRow(c) {
  return {
    id: c.id,
    name: c.name,
    title: c.title,
    tagline: c.tagline ?? "",
    quote: c.quote ?? "",
    description: c.description ?? "",
    edition: c.edition,
    edition_label: c.editionLabel ?? "",
    rarity: c.rarity,
    art: c.art,
    attributes: c.attributes ?? [],
    wardrobe_slots: c.wardrobeSlots ?? [],
    image_url: c.imageUrl || null,
    ...listingTo(c.listing),
    nft: c.nft ?? {},
    published: Boolean(c.published),
    sort_order: c.sortOrder ?? 0,
  };
}

export function rowToWearable(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    rarity: r.rarity,
    description: r.description,
    art: { kind: "wearable" },
    compatibleCharacters: r.compatible_characters ?? [],
    listing: listingFrom(r),
    imageUrl: r.image_url,
    visual: r.visual,
    nft: r.nft ?? {},
    published: r.published,
    sortOrder: r.sort_order,
  };
}

export function wearableToRow(w) {
  return {
    id: w.id,
    name: w.name,
    description: w.description ?? "",
    type: w.type,
    rarity: w.rarity,
    compatible_characters: w.compatibleCharacters ?? [],
    ...listingTo(w.listing),
    image_url: w.imageUrl || null,
    nft: w.nft ?? {},
    visual: w.visual,
    published: Boolean(w.published),
    sort_order: w.sortOrder ?? 0,
  };
}
