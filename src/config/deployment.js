import { NETWORK } from "./network";

// On-chain references for the current network, stored per catalogue item in
// `item.nft[network]` (set by nft/setup-marketplace.mjs or the admin
// dashboard). Only public addresses live there.
//
//   { collection, candyMachine, candyGuard, treasury, metadataUri, imageUri, mintLimitId }

// The item's deployment if it can be bought on this network, else null.
export function deploymentOf(item) {
  const d = item?.nft?.[NETWORK.id];
  return d?.collection && d?.candyMachine && d?.candyGuard ? d : null;
}

// { [itemId]: deployment } for every purchasable item.
export function deploymentsFor(items) {
  return Object.fromEntries(items.map((item) => [item.id, deploymentOf(item)]).filter(([, d]) => d));
}

// collection address → item id, to recognise Fuchey assets in a wallet.
// Any item with a collection counts, even if it isn't on sale any more.
export function collectionIndex(items) {
  return Object.fromEntries(
    items
      .map((item) => [item.nft?.[NETWORK.id]?.collection, item.id])
      .filter(([collection]) => collection),
  );
}
