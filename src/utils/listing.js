import { LISTING_STATUS } from "../data/taxonomy";

// Decides what the Buy / Claim button says and whether it can be used.
// Pure, so every card and detail page applies the same rules. The chain
// enforces all of this again on-chain; these checks are for clear UX only.
//
//   live: { deployed, remaining, mintCount }
//
// Buyable only with an *active* sale (item.sale, from the verified listings
// table) on a deployed item. The catalogue's own `listing.status` only decides
// how a not-yet-listed item is described ("Coming soon").
export function getPurchaseState(item, { connected, live = {}, purchasesEnabled = true }) {
  const { listing, sale } = item;
  const free = listing.price === 0;
  const verb = free ? "Claim" : "Buy";
  const kind = verb.toLowerCase();
  const label = `${verb} ${item.name}`;

  if (!sale && listing.status === LISTING_STATUS.COMING_SOON) {
    return { label: "Coming soon", disabled: true, kind: "soon" };
  }
  if (live.remaining === 0 || (!sale && listing.status === LISTING_STATUS.SOLD_OUT)) {
    return { label: "Sold out", disabled: true, kind: "sold-out" };
  }
  if (sale?.status === "ended") {
    return { label: "Sale ended", disabled: true, kind: "sold-out" };
  }
  if (sale && sale.status !== "active") {
    return { label: "Coming soon", disabled: true, kind: "soon", hint: "Minted — the sale hasn’t opened yet" };
  }
  if (listing.limitPerWallet && (live.mintCount ?? 0) >= listing.limitPerWallet) {
    return {
      label: free ? "Claimed" : "Limit reached",
      disabled: true,
      kind: "owned",
      hint: `One per wallet — this wallet already has its ${item.name}.`,
    };
  }
  if (!purchasesEnabled || !live.deployed || !sale) {
    return { label, shortLabel: verb, disabled: true, kind, hint: `Not on sale on this network yet` };
  }
  if (!connected) {
    return { label, shortLabel: verb, disabled: false, kind, needsWallet: true, hint: `Connect a wallet to ${kind}` };
  }

  return { label, shortLabel: verb, disabled: false, kind };
}
