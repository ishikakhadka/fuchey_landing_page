import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";

import { FEATURES } from "../config/features";
import { DEPLOYMENT, isDeployed } from "../config/deployment";
import { fetchLiveSupply, fetchMintCounts } from "../services/marketplace/listings";
import { fetchOwnedFucheyAssets } from "../services/nft/assets";
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

const hasDeployments = Object.keys(DEPLOYMENT.items).length > 0;

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
  const adapterWallet = useAdapterWallet();
  const address = adapterWallet.publicKey?.toBase58() ?? null;
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const supply = useChainQuery(fetchLiveSupply, `supply:${nonce}`, hasDeployments);
  const owned = useChainQuery(
    () => fetchOwnedFucheyAssets(address),
    `owned:${address}:${nonce}`,
    Boolean(address) && FEATURES.readOwnedAssets,
  );
  const counts = useChainQuery(
    () => fetchMintCounts(address),
    `counts:${address}:${nonce}`,
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
        wallet: adapterWallet,
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
    [adapterWallet, connection, refresh],
  );

  const closePurchase = useCallback(() => {
    setPurchase((p) => (p && ["preparing", "signing", "submitted"].includes(p.stage) ? p : null));
  }, []);

  const value = useMemo(() => {
    const ownedAssets = owned.data ?? [];
    return {
      address,
      supply: supply.data ?? {},
      supplyLoading: supply.loading,
      owned: ownedAssets,
      ownedLoading: owned.loading,
      ownedError: owned.error,
      mintCounts: counts.data ?? {},
      refresh,
      isDeployed,
      purchase,
      startPurchase,
      closePurchase,
    };
  }, [address, supply, owned, counts, refresh, purchase, startPurchase, closePurchase]);

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMarketplace() {
  return useContext(MarketplaceContext);
}
