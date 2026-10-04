import { WalletReadyState } from "@solana/wallet-adapter-base";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

export const PREFERRED_WALLET = "Solflare";

// Wallets that follow the Wallet Standard (Solflare's extension, Phantom,
// Backpack, …) are discovered automatically by the wallet adapter.
// The explicit Solflare adapter is a fallback for when the extension isn't
// installed: it can still connect through Solflare's web / mobile flow.
// If the extension *is* installed, its standard wallet replaces this adapter.
export function createWalletAdapters(network) {
  return [new SolflareWalletAdapter({ network })];
}

const READY_RANK = {
  [WalletReadyState.Installed]: 0,
  [WalletReadyState.Loadable]: 1,
  [WalletReadyState.NotDetected]: 2,
};

// Solflare first, then wallets that can connect right now, then the rest.
export function sortWallets(wallets) {
  return [...wallets].sort((a, b) => {
    const preferred =
      Number(b.adapter.name === PREFERRED_WALLET) - Number(a.adapter.name === PREFERRED_WALLET);
    if (preferred) return preferred;
    return (READY_RANK[a.readyState] ?? 3) - (READY_RANK[b.readyState] ?? 3);
  });
}

export function canConnect(readyState) {
  return readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable;
}

// Only reconnect silently on reload for wallets that are actually installed;
// otherwise Solflare's web fallback would pop a login window on every visit.
export function shouldAutoConnect(adapter) {
  return adapter.readyState === WalletReadyState.Installed;
}
