import { LISTING_STATUS } from "../data/taxonomy";
import { NETWORK } from "../config/network";

// Where an item stands on this network, for badges and filters. Same rules as
// getPurchaseState below (a verified `sale` decides what is on sale), without
// the per-wallet parts:
//
//   on-sale      an active sale on a deployed item: can be minted now
//   coming-soon  announced, or minted with a sale that hasn't opened
//   sold-out     no supply left, or the sale has ended
//   not-listed   in the catalogue but not on sale on this network
export const AVAILABILITY = {
  "on-sale": { id: "on-sale", label: "On sale", rank: 0 },
  "not-listed": { id: "not-listed", label: `Not on sale on ${NETWORK.label}`, rank: 1 },
  "coming-soon": { id: "coming-soon", label: "Coming soon", rank: 2 },
  "sold-out": { id: "sold-out", label: "Sold out", rank: 3 },
};

export function getAvailability(item, live = {}) {
  const { listing, sale } = item;

  if (!sale && listing.status === LISTING_STATUS.COMING_SOON) return AVAILABILITY["coming-soon"];
  if (live.remaining === 0 || (!sale && listing.status === LISTING_STATUS.SOLD_OUT)) {
    return AVAILABILITY["sold-out"];
  }
  if (sale?.status === "ended") return { ...AVAILABILITY["sold-out"], label: "Sale ended" };
  if (sale && sale.status !== "active") return { ...AVAILABILITY["coming-soon"], label: "Sale opens soon" };
  if (sale && live.deployed) {
    return listing.price === 0 ? { ...AVAILABILITY["on-sale"], label: "Free to claim" } : AVAILABILITY["on-sale"];
  }
  return AVAILABILITY["not-listed"];
}

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
