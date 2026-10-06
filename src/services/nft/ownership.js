import { NETWORK } from "../../config/network";
import { callFunction } from "../backend/client";

// What a wallet owns in Fuchey, resolved by the backend from the chain
// (supabase/functions/inventory): wallet address → Core assets in Fuchey
// collections → characters and wearables, plus saved looks limited to owned,
// compatible wearables. Only the address matters — any wallet app works.
export async function fetchInventory(wallet) {
  return callFunction("inventory", { wallet, network: NETWORK.id });
}

// Inventory → the flat list of owned assets the UI uses:
// [{ address, owner, name, itemId, kind }]
export function ownedAssets(inventory) {
  if (!inventory) return [];
  const one = (kind) => (a) => ({ address: a.asset, owner: inventory.wallet, name: a.name, itemId: a.assetId, kind });
  return [...inventory.characters.map(one("character")), ...inventory.wearables.map(one("wearable"))];
}

// For the Fuchey companion: wallet → owned NFTs → Fuchey asset ids.
// → [{ assetId, type: "character" | "wearable", nftAssetAddress, ownerWallet, name }]
// This answers *ownership* only. Whether an owned wearable can go on a
// character is still fitsCharacter() (services/marketplace/catalog.js).
export async function getOwnedFucheyAssets(walletAddress) {
  const inventory = await fetchInventory(walletAddress);
  return inventory.assets;
}
