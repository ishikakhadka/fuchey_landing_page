import { useEffect, useState } from "react";

// useState that's remembered for this browsing session (sessionStorage, as
// JSON), so it survives leaving the page and coming back, or a reload, but
// starts fresh in a new tab or after the browser is closed. Storage can be
// missing or blocked (private windows, previews): then it quietly behaves
// like plain useState.
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved != null) return JSON.parse(saved);
    } catch {
      // Unreadable or blocked: fall back to the initial value.
    }
    return typeof initial === "function" ? initial() : initial;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Full or blocked: keep it in memory only.
    }
  }, [key, value]);

  return [value, setValue];
}
