import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { FEATURES } from "../config/features";
import { collectionIndex, deploymentsFor } from "../config/deployment";
import { useCatalog } from "./CatalogContext";
import { useWallet } from "../hooks/useWallet";
import { fetchLiveSupply, fetchMintCounts } from "../services/marketplace/listings";
import { fetchInventory, ownedAssets } from "../services/nft/ownership";
import { purchaseItem } from "../services/marketplace/mint";
import { describePurchaseError } from "../services/marketplace/errors";

// Chain-backed marketplace state shared by every page:
//   - live supply per item (from the candy machines)
//   - the connected wallet's Fuchey assets and per-wallet claim counts
//   - the in-flight purchase, shown by <PurchaseDialog />
//
// Everything here reflects confirmed on-chain state; a purchase only changes
// it by triggering a re-read after Solana confirms.

const MarketplaceContext = createContext(null);

// Keeps the last good result while a refresh is in flight (no flicker).
function useChainQuery(load, key, enabled = true) {
  const [state, setState] = useState({ key: null, data: undefined, error: null });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    load().then(
      (data) => active && setState({ key, data, error: null }),
      (error) => active && setState((s) => ({ ...s, key, error })),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return {
    data: enabled ? state.data : undefined,
    error: enabled ? state.error : null,
    loading: enabled && state.key !== key,
  };
}

export function MarketplaceProvider({ children }) {
  const { connection } = useConnection();
  const { address, signer } = useWallet();
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // On-chain references come from the catalogue (item.nft[network]).
  const { characters, wearables } = useCatalog();
  const { deployments, index, chainKey } = useMemo(() => {
    const items = [...characters, ...wearables];
    const deployments = deploymentsFor(items);
    const index = collectionIndex(items);
    return {
      deployments,
      index,
      chainKey: JSON.stringify([Object.values(deployments).map((d) => d.candyMachine), Object.keys(index)]),
    };
  }, [characters, wearables]);
  const hasDeployments = Object.keys(deployments).length > 0;

  const supply = useChainQuery(() => fetchLiveSupply(deployments), `supply:${chainKey}:${nonce}`, hasDeployments);
  // Ownership: resolved by the backend from the chain (any wallet app).
  const owned = useChainQuery(
    () => fetchInventory(address),
    `owned:${address}:${chainKey}:${nonce}`,
    Boolean(address) && FEATURES.readOwnedAssets,
  );
  const counts = useChainQuery(
    () => fetchMintCounts(address, deployments),
    `counts:${address}:${chainKey}:${nonce}`,
    Boolean(address) && hasDeployments,
  );

  // --- purchases ------------------------------------------------------------
  const [purchase, setPurchase] = useState(null);

  const startPurchase = useCallback(
    (item) => {
      const id = Date.now();
      const update = (patch) =>
        setPurchase((p) => (p?.id === id ? { ...p, ...patch } : p));

      setPurchase({ id, item, stage: "preparing", signature: null, asset: null, error: null });

      purchaseItem({
        item,
        wallet: signer,
        connection,
        onStage: (stage, details = {}) => update({ stage, ...details }),
      })
        .then(() => refresh())
        .catch((error) => {
          console.warn("[purchase]", error);
          update({ stage: "error", error: describePurchaseError(error), signature: error?.signature ?? null });
          // A failed attempt can still change state (e.g. someone else sold out).
          refresh();
        });
    },
    [signer, connection, refresh],
  );

  const closePurchase = useCallback(() => {
    setPurchase((p) => (p && ["preparing", "signing", "submitted", "verifying"].includes(p.stage) ? p : null));
  }, []);

  const value = useMemo(() => {
    return {
      address,
      supply: supply.data ?? {},
      supplyLoading: supply.loading,
      owned: ownedAssets(owned.data),
      inventory: owned.data ?? null,
      ownedLoading: owned.loading,
      ownedError: owned.error,
      mintCounts: counts.data ?? {},
      refresh,
      collectionIndex: index,
      isDeployed: (id) => Boolean(deployments[id]),
      purchase,
      startPurchase,
      closePurchase,
    };
  }, [address, supply, owned, counts, refresh, index, deployments, purchase, startPurchase, closePurchase]);

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMarketplace() {
  return useContext(MarketplaceContext);
}
