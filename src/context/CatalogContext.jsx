import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCatalog } from "../services/marketplace/catalog";

// The published catalogue (characters + wearables), loaded once from the
// backend and shared by every page. `reload()` refetches — the admin
// dashboard calls it after publishing so the public pages update in place.

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ nonce: -1, data: null, error: null });

  useEffect(() => {
    let active = true;
    fetchCatalog().then(
      (data) => active && setState({ nonce, data, error: null }),
      (error) => {
        console.warn("[catalog]", error);
        if (active) setState((s) => ({ ...s, nonce, error }));
      },
    );
    return () => {
      active = false;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((x) => x + 1), []);

  const value = useMemo(() => {
    const characters = state.data?.characters ?? [];
    const wearables = state.data?.wearables ?? [];
    return {
      characters,
      wearables,
      loading: !state.data && !state.error,
      refreshing: state.nonce !== nonce,
      error: state.error,
      reload,
      // Any catalogue item by id, tagged with its kind.
      findItem: (id) => {
        const character = characters.find((c) => c.id === id);
        if (character) return { ...character, kind: "character" };
        const wearable = wearables.find((w) => w.id === id);
        return wearable ? { ...wearable, kind: "wearable" } : null;
      },
    };
  }, [state, nonce, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog() {
  return useContext(CatalogContext);
}
