// Registry statuses (public.nft_status) and how an owner was acquired
// (public.nft_acquisition), for the admin NFT pages.

export const NFT_STATUS = {
  owned: { label: "Owned", tone: "is-live" },
  unverified: { label: "Unverified", tone: "is-bad" },
  burned: { label: "Burned", tone: "is-bad" },
  unknown: { label: "Unknown", tone: "" },
};

export const ACQUISITION = {
  marketplace: "Marketplace",
  transfer: "Transfer",
  unknown: "Unknown",
};
