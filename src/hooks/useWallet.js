import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { NETWORK } from "../config/network";
import { useWalletUI } from "../context/WalletContext";

// The app's single view of the user's wallet — the wallet abstraction layer.
// Everything in the marketplace goes through this, so any Solana wallet app
// (Phantom, Solflare, Backpack, a future Fuchey Wallet, …) works the same way.
// Nothing here or downstream branches on which wallet app it is: code checks
// capabilities (`can.*`) and uses `address`, never the wallet's name.
//
//   status: "disconnected" | "connecting" | "connected" | "disconnecting"
//   address: base58 public key — the only wallet identity ever stored
//   signer:  { publicKey, signMessage, signTransaction, signAllTransactions }
//            (what signing services such as Metaplex Umi need)
//
// `walletName` / `walletIcon` are for display only. Private keys are never
// available here or anywhere in the app.
export function useWallet() {
  const adapter = useAdapterWallet();
  const ui = useWalletUI();
  const { wallet, publicKey, connected, connecting, disconnecting } = adapter;

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
    can: {
      signMessage: Boolean(adapter.signMessage),
      signTransaction: Boolean(adapter.signTransaction || adapter.signAllTransactions),
    },
    signer: adapter,
    wallets: ui.wallets,
    openModal: ui.openModal,
    connect: ui.connectWallet,
    disconnect: ui.disconnectWallet,
  };
}
