import { Bot, Smile } from "lucide-react";

export const editions = {
  dev: {
    id: "dev",
    label: "Dev Edition",
    shortLabel: "Dev",
    icon: Bot,

    eyebrow: "FUCHEY // DEV EDITION",

    title: "Build with",
    accent: "Fuchey.",
    description:
      "A physical Solana interface built for developers, hackers, builders, and technical users.",

    cta: "Join Dev Waitlist",

    highlights: ["Live on-chain logs", "Physical signing", "USB-C dev port"],

    audience: "For builders & hackers",
    pitch:
      "A physical tool for interacting with and understanding the Solana ecosystem — right on your desk.",
    specs: ["Live transaction logs", "Signature approvals", "Cluster switching"],

    marquee: [
      "Devnet",
      "Testnet",
      "Transaction logs",
      "Program calls",
      "RPC events",
      "Webhooks",
      "Physical signing",
    ],

    featuresEyebrow: "DEVELOPER TOOLKIT",
    featuresTitle: "Closer to the chain.",
    features: [
      {
        title: "Devnet / Testnet",
        desc: "Flip between clusters and watch any network without touching your laptop.",
      },
      {
        title: "Transaction Logs",
        desc: "Slots, signatures and compute units streaming live on the display.",
      },
      {
        title: "Wallet Debugging",
        desc: "See balances and account changes the moment they land.",
      },
      {
        title: "Program Interactions",
        desc: "Get a physical ping every time your program is invoked.",
      },
      {
        title: "RPC / API Events",
        desc: "Surface RPC and API events as they happen, not in a buried tab.",
      },
      {
        title: "Webhooks",
        desc: "Wire your own events to Fuchey and make it react to your stack.",
      },
    ],

    status: "SYSTEM ONLINE",
  },

  companion: {
    id: "companion",
    label: "Companion Edition",
    shortLabel: "Companion",
    icon: Smile,

    eyebrow: "MEET FUCHEY",

    title: "Your wallet just got a",
    accent: "little friend.",
    description:
      "A playful Solana desk companion that turns your wallet activity into moods, interactions, collectibles, and tiny moments of joy.",

    cta: "Join Companion Waitlist",

    highlights: ["Reacts to transactions", "Moods & levels", "3 physical buttons"],

    audience: "For everyday Solana users",
    pitch:
      "A cute crypto companion that makes your wallet feel personal, approachable and fun.",
    specs: ["Wallet reactions", "Moods & progression", "Collectible wearables"],

    marquee: [
      "Wallet activity",
      "Moods",
      "Collectibles",
      "Achievements",
      "Wearables",
      "Daily check-ins",
      "Pet evolution",
    ],

    featuresEyebrow: "FUCHEY LIFE",
    featuresTitle: "A wallet with a little personality.",
    features: [
      {
        title: "Wallet Activity",
        desc: "Sends, receives and mints show up as little moments on screen.",
      },
      {
        title: "Moods",
        desc: "Fuchey gets happy, curious or sleepy depending on your wallet's day.",
      },
      {
        title: "Collectibles",
        desc: "Unlock wearables and items — starting with the Frost Scarf.",
      },
      {
        title: "Achievements",
        desc: "Keep streaks, hit milestones and earn badges as you go.",
      },
      {
        title: "Daily Interactions",
        desc: "Three physical buttons to browse, play and check in every day.",
      },
      {
        title: "Pet Evolution",
        desc: "Fuchey levels up and grows its own personality over time.",
      },
    ],
  },
};
