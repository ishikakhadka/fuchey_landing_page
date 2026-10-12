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
  {
    id: "cartoon",
    name: "Cartoon Pack",
    tagline: "Saturday-morning friends.",
    description:
      "Round, bouncy and hand-drawn smooth: a pup, a bunny, a penguin and a little robot who all live on the same funny-pages street.",
    wardrobe: {
      tagline: "Dress up, cartoon style.",
      description: "Propeller caps, party hats, star shades, overalls, a hero cape and a balloon that never pops.",
    },
  },
  {
    id: "anime",
    name: "Anime Pack",
    tagline: "Big eyes, bigger destinies.",
    description:
      "Heroes and spirits straight out of a Saturday-night anime: a spiky-haired fighter, a magical girl, a silent swordsman and a fox who keeps a shrine.",
    wardrobe: {
      tagline: "Your transformation sequence.",
      description: "Headbands, cat-ear headphones, a kitsune mask, a sailor uniform, a practice sword and a drift of sakura petals.",
    },
  },
  {
    id: "myths",
    name: "Myths Reimagined",
    tagline: "Old gods, new wallets.",
    description:
      "Figures from the oldest stories, redrawn small and friendly: a jackal guide of the underworld, a gorgon with a nest of snakes, a monkey who defied heaven and a bull from the labyrinth.",
    wardrobe: {
      tagline: "Temple gold.",
      description: "A laurel wreath, a pharaoh’s headcloth, an Olympian toga, an ankh, a trident, a bronze shield and clouds fit for a mountaintop.",
    },
  },
  {
    id: "legends",
    name: "Legends Reimagined",
    tagline: "Tales told after dark.",
    description:
      "Folklore and fireside stories made pocket-sized: a count who only comes out at night, an outlaw archer of the greenwood, a wizard of the old court and a detective who follows every scent.",
    wardrobe: {
      tagline: "Dress for the story.",
      description: "A deerstalker, a wizard’s hat, a monocle, a midnight cape, a magnifying glass, a longbow and will-o’-wisps.",
    },
  },
  {
    id: "heroes",
    name: "Superheroes Reimagined",
    tagline: "Capes on. Wallets safe.",
    description:
      "An all-new squad of Fuchey heroes: a speedster who outruns block times, a flier with cloud hair, an armoured pangolin and an owl who keeps watch all night.",
    wardrobe: {
      tagline: "Suit up.",
      description: "A crest helmet, a power visor, a power suit, a storm cape, a jet pack, an energy orb and a full-power aura.",
    },
  },
  {
    id: "brainrot",
    name: "Brainrot Pack",
    tagline: "Absolutely no thoughts. Only vibes.",
    description:
      "Unhinged mash-up creatures with names you can’t stop saying: a toaster frog, an ice-cream owl, a washing-machine cat and a tomato penguin.",
    wardrobe: {
      tagline: "Maximum aura.",
      description: "A spaghetti bowl hat, a maestro moustache, a drip tracksuit, a big gold chain, a pizza backpack, a tiny espresso and infinite aura.",
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
