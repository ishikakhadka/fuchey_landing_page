import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_HOME_SETTINGS, fetchHomeContent } from "../services/backend/content";

// Admin-managed site content (drops, hero slides, home settings), loaded once
// and shared. `reload()` refetches; the admin calls it after saving.

const ContentContext = createContext(null);

const EMPTY = { drops: [], slides: [], settings: DEFAULT_HOME_SETTINGS };

export function ContentProvider({ children }) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ data: null, error: null });

  useEffect(() => {
    let active = true;
    fetchHomeContent().then(
      (data) => active && setState({ data, error: null }),
      (error) => {
        console.warn("[content]", error);
        if (active) setState({ data: EMPTY, error });
      },
    );
    return () => {
      active = false;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((x) => x + 1), []);

  const value = useMemo(
    () => ({ ...(state.data ?? EMPTY), loading: !state.data, error: state.error, reload }),
    [state, reload],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContent() {
  return useContext(ContentContext);
}
