import { useEffect, useState } from "react";

// The current time, refreshed every `ms` (default: each second). Drives
// countdowns; one interval per caller, cleared on unmount.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
