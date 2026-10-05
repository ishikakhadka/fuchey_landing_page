import { WalletReadyState } from "@solana/wallet-adapter-base";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

// Wallet providers. The marketplace never cares which one is in use — it only
// uses the capabilities exposed by hooks/useWallet.js (address, sign message,
// sign / send transactions). Ownership is tied to the address, so switching
// wallet apps never affects anyone's NFTs.
//
// Any wallet implementing the Solana Wallet Standard (Phantom, Backpack,
// Solflare's extension, and a future Fuchey Wallet) is discovered
// automatically — no code needed here. List adapters below only for wallets
// that also need a non-extension connection flow (web / mobile). The Solflare
// adapter is here for that reason: it can connect without the extension.
export function createWalletAdapters(network) {
  return [new SolflareWalletAdapter({ network })];
}

const READY_RANK = {
  [WalletReadyState.Installed]: 0,
  [WalletReadyState.Loadable]: 1,
  [WalletReadyState.NotDetected]: 2,
};

// Wallets that can connect right now first, then alphabetical. No brand is
// preferred over another.
export function sortWallets(wallets) {
  return [...wallets].sort(
    (a, b) =>
      (READY_RANK[a.readyState] ?? 3) - (READY_RANK[b.readyState] ?? 3) ||
      a.adapter.name.localeCompare(b.adapter.name),
  );
}

export function canConnect(readyState) {
  return readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable;
}

// Only reconnect silently on reload for wallets that are actually installed;
// otherwise a web-flow adapter would pop a login window on every visit.
export function shouldAutoConnect(adapter) {
  return adapter.readyState === WalletReadyState.Installed;
}
