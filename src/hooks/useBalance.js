import { useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { getSolBalance } from "../services/solana/balance";
import { useAsync } from "./useAsync";
import { useWallet } from "./useWallet";

// SOL balance of the connected wallet. `refresh()` re-reads it.
export function useBalance() {
  const { connection } = useConnection();
  const { publicKey, address } = useWallet();
  const [nonce, setNonce] = useState(0);

  const { data, loading, error } = useAsync(
    () => (publicKey ? getSolBalance(connection, publicKey) : Promise.resolve(null)),
    `${address}:${nonce}`,
  );

  return {
    balance: data ?? null,
    loading: Boolean(address) && loading,
    error,
    refresh: () => setNonce((n) => n + 1),
  };
}
