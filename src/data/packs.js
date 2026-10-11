// Packs: how the Characters page and the Wardrobe group the catalogue. Each
// character and wearable row names its pack (characters.pack,
// wearables.pack); a pack shows once it has at least one published item.
//
// Adding a pack: add it here and to PACKS in
// supabase/functions/_shared/validate.ts, then pick it in the admin editor.

export const packs = [
  {
    id: "wild",
    name: "Wild Pack",
    tagline: "Where every Fuchey started.",
    description:
      "Creatures of the glacier and the grassland — the original Fuchey companions and the big beasts still on the trail.",
    wardrobe: {
      tagline: "Cold-wallet classics.",
      description: "Beanies, scarves, crowns and keepsakes — everything the first Fuchey friends wore.",
    },
  },
  {
    id: "pirates",
    name: "Pirate Pack",
    tagline: "Salt, gold and a little curse.",
    description:
      "Bosses of the open sea. A captain who never lost a wager, a deckhand with too many arms and a crewmate who wouldn’t stay buried.",
    wardrobe: {
      tagline: "Dress for the high seas.",
      description: "A tricorn, an eyepatch, a cutlass and a parrot with opinions. Everything a captain needs.",
    },
  },
  {
    id: "tribal",
    name: "Tribal Pack",
    tagline: "Masks, feathers and old magic.",
    description:
      "Warriors and mystics from the deep jungle, guarding trails that don’t show up on any map.",
    wardrobe: {
      tagline: "Feathers, wood and bone.",
      description: "A feathered headdress, a carved tiki mask, a bone necklace and a spear taller than you.",
    },
  },
  {
    id: "rogues",
    name: "Rogues Pack",
    tagline: "Light fingers, loyal hearts.",
    description:
      "Goblins and bandits who’d pick any pocket — except yours. Once they’re in your wallet, they guard it.",
    wardrobe: {
      tagline: "Look like trouble.",
      description: "A deep hood, a domino mask and a coin pouch that’s suspiciously full.",
    },
  },
];

export const DEFAULT_PACK = "wild";

export function getPack(id) {
  return packs.find((p) => p.id === id) ?? packs.find((p) => p.id === DEFAULT_PACK);
}

// Catalogue items → the packs that have any, each with its `items` in
// catalogue order. An item naming an unknown pack falls back to Wild.
export function groupByPack(items) {
  return packs
    .map((pack) => ({ ...pack, items: items.filter((item) => getPack(item.pack).id === pack.id) }))
    .filter((pack) => pack.items.length);
}
