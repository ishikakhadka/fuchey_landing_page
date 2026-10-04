import { useMemo } from "react";
import { FEATURES } from "../config/features";
import { useMarketplace } from "../context/MarketplaceContext";
import { useWallet } from "./useWallet";
import { characters } from "../data/characters";

const CHARACTER_IDS = new Set(characters.map((c) => c.id));

// The connected wallet's Fuchey assets, read from the chain.
// Ownership is never inferred from UI state — only confirmed on-chain assets
// in a Fuchey collection count.
export function useCollection() {
  const { address, connected } = useWallet();
  const market = useMarketplace();

  return useMemo(() => {
    const owned = connected ? market.owned : [];
    const ownedIds = new Set(owned.map((a) => a.itemId));

    return {
      address,
      connected,
      supported: FEATURES.readOwnedAssets,
      loading: market.ownedLoading,
      error: market.ownedError,
      refresh: market.refresh,
      assets: owned,
      characters: owned.filter((a) => CHARACTER_IDS.has(a.itemId)),
      wearables: owned.filter((a) => !CHARACTER_IDS.has(a.itemId)),
      ownsCharacter: (id) => ownedIds.has(id),
      ownsWearable: (id) => ownedIds.has(id),
      countOwned: (id) => owned.filter((a) => a.itemId === id).length,
    };
  }, [address, connected, market]);
}
