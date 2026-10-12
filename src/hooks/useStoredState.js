import { useEffect, useState } from "react";

// useState that's remembered in this browser (localStorage, as JSON), so it
// survives leaving the page and coming back. Storage can be missing or
// blocked (private windows, previews): then it quietly behaves like plain
// useState.
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) return JSON.parse(saved);
    } catch {
      // Unreadable or blocked: fall back to the initial value.
    }
    return typeof initial === "function" ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Full or blocked: keep it in memory only.
    }
  }, [key, value]);

  return [value, setValue];
}
