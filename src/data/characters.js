import { sprites } from "./sprites.js";

// Character catalogue.
//
// Each entry has three parts that are kept deliberately separate:
//   - identity  (name, art, attributes)  → what ends up in the NFT metadata
//   - listing   (price, supply, limits)  → marketplace config, never written into the NFT
//
// On-chain addresses (collection, candy machine) live in deployments/<network>.json,
// written by nft/setup-marketplace.mjs. Live remaining supply is read from the
// candy machine, never stored here.
//
// No asset imports, so nft/ tooling can import this file directly.

export const characters = [
  {
    id: "yeti",
    name: "Yeti",
    title: "Fuchey Yeti",
    tagline: "Basic Companion",
    edition: "companion",
    editionLabel: "Basic",
    rarity: "common",
    quote: "Your wallet just got a little friend.",
    description:
      "The original Fuchey. A soft, frosty little desk companion that reacts to your wallet — happy when tokens land, curious when something new arrives, sleepy when the chain goes quiet.",
    art: { kind: "character", image: "yeti" },
    attributes: [
      { trait_type: "Character", value: "Yeti" },
      { trait_type: "Edition", value: "Basic" },
      { trait_type: "Mood", value: "Friendly" },
      { trait_type: "Habitat", value: "Glacier" },
    ],
    wardrobeSlots: ["hat", "headwear", "outfit", "accessory", "backpack", "held", "special"],
    listing: {
      status: "available",
      price: 0,
      supply: 10000,
      limitPerWallet: 1,
    },
  },
  {
    id: "cyber",
    name: "Cyber",
    title: "Fuchey Cyber",
    tagline: "Dev Edition",
    edition: "dev",
    editionLabel: "Dev",
    rarity: "rare",
    quote: "Build with Fuchey.",
    description:
      "A night-shift Yeti for builders. Glowing eyes, soft midnight fur, and a soft spot for green test suites — Cyber pings on every invoke.",
    art: { kind: "character", image: "cyber" },
    attributes: [
      { trait_type: "Character", value: "Cyber" },
      { trait_type: "Edition", value: "Dev" },
      { trait_type: "Mood", value: "Focused" },
      { trait_type: "Habitat", value: "Terminal" },
    ],
    wardrobeSlots: ["hat", "headwear", "outfit", "accessory", "backpack", "held", "special"],
    listing: {
      status: "available",
      price: 0.5,
      supply: 1000,
      limitPerWallet: null,
    },
  },
  {
    id: "robot",
    name: "Robot",
    title: "Fuchey Robot",
    tagline: "Coming Soon",
    edition: "dev",
    editionLabel: "Prototype",
    rarity: "epic",
    quote: "Something is booting up.",
    description:
      "Still on the workbench. The Robot is the next character joining the Fuchey family — details soon.",
    art: { kind: "sprite", sprite: sprites.robot, locked: true },
    attributes: [
      { trait_type: "Character", value: "Robot" },
      { trait_type: "Edition", value: "Prototype" },
    ],
    wardrobeSlots: [],
    listing: {
      status: "coming-soon",
      price: null,
      supply: null,
      limitPerWallet: null,
    },
  },
];
