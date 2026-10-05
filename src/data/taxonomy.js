// Shared vocabularies for the marketplace catalogue.

export const RARITIES = {
  common: { id: "common", label: "Common", rank: 0 },
  uncommon: { id: "uncommon", label: "Uncommon", rank: 1 },
  rare: { id: "rare", label: "Rare", rank: 2 },
  epic: { id: "epic", label: "Epic", rank: 3 },
  legendary: { id: "legendary", label: "Legendary", rank: 4 },
};

// Wardrobe slots. A character can wear at most one item per slot.
export const WEARABLE_TYPES = [
  { id: "hat", label: "Hats" },
  { id: "headwear", label: "Headwear" },
  { id: "outfit", label: "Outfits" },
  { id: "accessory", label: "Accessories" },
  { id: "backpack", label: "Backpacks" },
  { id: "held", label: "Held Items" },
  { id: "special", label: "Special Items" },
];

// Listing lifecycle, independent of the NFT itself.
export const LISTING_STATUS = {
  AVAILABLE: "available",
  COMING_SOON: "coming-soon",
  SOLD_OUT: "sold-out",
};

// Stacking order of wardrobe layers on a character, back to front. A
// wearable's `visual.layer` (default: its type) picks its place here and
// `visual.z` nudges it within that layer.
export const SLOT_ORDER = ["outfit", "backpack", "accessory", "headwear", "hat", "held", "special"];
