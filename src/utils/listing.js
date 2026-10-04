import { LISTING_STATUS } from "../data/taxonomy";

// Decides what the Buy / Claim button says and whether it can be used.
// Pure, so every card and detail page applies the same rules. The chain
// enforces all of this again on-chain; these checks are for clear UX only.
//
//   live: { deployed, remaining, mintCount }
export function getPurchaseState(item, { connected, live = {}, purchasesEnabled = true }) {
  const { listing } = item;
  const free = listing.price === 0;
  const verb = free ? "Claim" : "Buy";
  const kind = verb.toLowerCase();
  const label = `${verb} ${item.name}`;

  if (listing.status === LISTING_STATUS.COMING_SOON) {
    return { label: "Coming soon", disabled: true, kind: "soon" };
  }
  if (listing.status === LISTING_STATUS.SOLD_OUT || live.remaining === 0) {
    return { label: "Sold out", disabled: true, kind: "sold-out" };
  }
  if (listing.limitPerWallet && (live.mintCount ?? 0) >= listing.limitPerWallet) {
    return {
      label: free ? "Claimed" : "Limit reached",
      disabled: true,
      kind: "owned",
      hint: `One per wallet — this wallet already has its ${item.name}.`,
    };
  }
  if (!purchasesEnabled || !live.deployed) {
    return { label, shortLabel: verb, disabled: true, kind, hint: `Not on sale on this network yet` };
  }
  if (!connected) {
    return { label, shortLabel: verb, disabled: false, kind, needsWallet: true, hint: `Connect a wallet to ${kind}` };
  }

  return { label, shortLabel: verb, disabled: false, kind };
}
