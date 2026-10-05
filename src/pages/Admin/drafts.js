import { WEARABLE_TYPES } from "../../data/taxonomy";

// Empty items for the admin editors.

export function newWearable(sortOrder = 0) {
  return {
    id: "",
    name: "",
    description: "",
    type: "hat",
    rarity: "common",
    compatibleCharacters: [],
    listing: { status: "coming-soon", price: null, supply: null, limitPerWallet: null },
    imageUrl: null,
    nft: {},
    visual: { kind: "image", layer: "hat", z: 0, image: null, width: null, height: null, x: 0, y: 0, scale: 1 },
    published: false,
    sortOrder,
  };
}

export function newCharacter(sortOrder = 0) {
  return {
    id: "",
    name: "",
    title: "",
    tagline: "",
    quote: "",
    description: "",
    edition: "companion",
    editionLabel: "",
    rarity: "common",
    art: { kind: "character", image: "yeti" },
    attributes: [],
    wardrobeSlots: WEARABLE_TYPES.map((t) => t.id),
    listing: { status: "coming-soon", price: null, supply: null, limitPerWallet: null },
    nft: {},
    published: false,
    sortOrder,
  };
}
