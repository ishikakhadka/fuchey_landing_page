import { useMarketplace } from "../context/MarketplaceContext";

// Live, chain-backed listing info for one catalogue item, from the shared
// marketplace state. Plain function so list views (filters, sorting) can read
// it for every item without calling a hook per item.
export function liveListing(market, item) {
  const live = market.supply[item.id];

  return {
    deployed: market.isDeployed(item.id),
    supply: live?.supply ?? item.listing.supply,
    remaining: live?.remaining ?? null,
    redeemed: live?.redeemed ?? null,
    mintCount: market.mintCounts[item.id] ?? 0,
    loading: market.supplyLoading,
  };
}

export function useListing(item) {
  return liveListing(useMarketplace(), item);
}
