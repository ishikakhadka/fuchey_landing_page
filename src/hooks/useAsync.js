import { useEffect, useState } from "react";

// Runs `load` whenever `key` changes and tracks its result.
// `loading` is derived (result belongs to an older key) so the effect never
// has to set state synchronously.
export function useAsync(load, key) {
  const [result, setResult] = useState({ key: undefined, data: undefined, error: null });

  useEffect(() => {
    let active = true;

    load().then(
      (data) => active && setResult({ key, data, error: null }),
      (error) => active && setResult({ key, data: undefined, error }),
    );

    return () => {
      active = false;
    };
    // `load` is expected to be an inline closure over `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result.key === key;

  return {
    data: current ? result.data : undefined,
    error: current ? result.error : null,
    loading: !current,
  };
}
