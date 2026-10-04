import { NETWORK } from "./network";
import devnet from "../data/deployments/devnet.json";
import mainnet from "../data/deployments/mainnet-beta.json";

// On-chain addresses for the current network, written by nft/setup-marketplace.mjs.
// Only public addresses live here.
const DEPLOYMENTS = { devnet, "mainnet-beta": mainnet };

export const DEPLOYMENT = DEPLOYMENTS[NETWORK.id] ?? { items: {} };

export function getDeployment(itemId) {
  return DEPLOYMENT.items[itemId] ?? null;
}

export function isDeployed(itemId) {
  return Boolean(DEPLOYMENT.items[itemId]);
}

// collection address → item id, to recognise Fuchey assets in a wallet.
export const COLLECTION_INDEX = Object.fromEntries(
  Object.entries(DEPLOYMENT.items).map(([id, d]) => [d.collection, id]),
);
