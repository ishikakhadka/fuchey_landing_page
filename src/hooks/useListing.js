import { useMarketplace } from "../context/MarketplaceContext";

// Live, chain-backed listing info for one catalogue item.
export function useListing(item) {
  const market = useMarketplace();
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
