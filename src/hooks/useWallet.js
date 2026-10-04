import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { NETWORK } from "../config/network";
import { useWalletUI } from "../context/WalletContext";

// The app's single view of the user's wallet.
//
//   status: "disconnected" | "connecting" | "connected" | "disconnecting"
//
// `address` is the public key as a base58 string — safe to show and store.
// Signing (Phase 4) goes through services/, which receive the adapter wallet;
// private keys are never available here or anywhere in the app.
export function useWallet() {
  const { wallet, publicKey, connected, connecting, disconnecting } = useAdapterWallet();
  const ui = useWalletUI();

  const status = connected
    ? "connected"
    : connecting
      ? "connecting"
      : disconnecting
        ? "disconnecting"
        : "disconnected";

  return {
    status,
    connected,
    address: publicKey?.toBase58() ?? null,
    publicKey,
    walletName: wallet?.adapter.name ?? null,
    walletIcon: wallet?.adapter.icon ?? null,
    network: NETWORK,
    wallets: ui.wallets,
    openModal: ui.openModal,
    connect: ui.connectWallet,
    disconnect: ui.disconnectWallet,
  };
}
