import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet as useAdapterWallet,
} from "@solana/wallet-adapter-react";

import { NETWORK } from "../config/network";
import {
  canConnect,
  createWalletAdapters,
  shouldAutoConnect,
  sortWallets,
} from "../services/wallet/adapters";
import { describeWalletError } from "../services/wallet/errors";

// Wallet plumbing for the whole app.
//
// The Solana wallet adapter owns the connection itself (and the user's keys
// never leave their wallet). This layer adds what the UI needs on top: the
// wallet picker's open state, friendly toasts, and Solflare-first ordering.
// Components read it through hooks/useWallet.js, never from here directly.

const WalletUIContext = createContext(null);

let toastId = 0;

export function SolanaWalletProvider({ children }) {
  // True between the user picking a wallet and that attempt finishing, so we
  // only surface errors/toasts for connections the user actually asked for.
  const userInitiated = useRef(false);
  const [toast, setToast] = useState(null);

  const adapters = useMemo(() => createWalletAdapters(NETWORK.id), []);

  const autoConnect = useCallback(
    async (adapter) => userInitiated.current || shouldAutoConnect(adapter),
    [],
  );

  const setUserInitiated = useCallback((value) => {
    userInitiated.current = value;
  }, []);

  // Returns whether the current attempt was user-initiated, and clears it.
  const consumeUserInitiated = useCallback(() => {
    const value = userInitiated.current;
    userInitiated.current = false;
    return value;
  }, []);

  const onError = useCallback((error) => {
    if (!userInitiated.current) {
      console.warn("[wallet]", error);
      return;
    }
    userInitiated.current = false;
    setToast({ id: ++toastId, kind: "error", ...describeWalletError(error) });
  }, []);

  return (
    <ConnectionProvider endpoint={NETWORK.rpcUrl}>
      <WalletProvider wallets={adapters} autoConnect={autoConnect} onError={onError}>
        <WalletUIProvider
          setUserInitiated={setUserInitiated}
          consumeUserInitiated={consumeUserInitiated}
          toast={toast}
          setToast={setToast}>
          {children}
        </WalletUIProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletUIProvider({ setUserInitiated, consumeUserInitiated, toast, setToast, children }) {
  const { wallets, wallet, select, connect, disconnect } = useAdapterWallet();
  const [modalOpen, setModalOpen] = useState(false);

  // Close the picker and confirm once the wallet reports a real connection.
  useEffect(() => {
    const adapter = wallet?.adapter;
    if (!adapter) return;

    const onConnect = () => {
      setModalOpen(false);
      if (!consumeUserInitiated()) return;
      setToast({
        id: ++toastId,
        kind: "success",
        title: "Wallet connected",
        message: `${adapter.name} is connected on ${NETWORK.label}.`,
      });
    };

    adapter.on("connect", onConnect);
    return () => adapter.off("connect", onConnect);
  }, [wallet, consumeUserInitiated, setToast]);

  const connectWallet = useCallback(
    (name) => {
      const target = wallets.find((w) => w.adapter.name === name);
      if (!target) return;

      if (!canConnect(target.readyState)) {
        window.open(target.adapter.url, "_blank", "noopener,noreferrer");
        return;
      }

      setToast(null);
      setUserInitiated(true);

      // `select` triggers the connection via autoConnect; re-selecting the
      // same wallet is a no-op, so connect it directly instead.
      if (wallet?.adapter.name === name) {
        connect().catch(() => {}); // reported through onError
      } else {
        select(name);
      }
    },
    [wallets, wallet, select, connect, setUserInitiated, setToast],
  );

  const disconnectWallet = useCallback(() => {
    setUserInitiated(false);
    setModalOpen(false);
    disconnect().catch((error) => console.warn("[wallet]", error));
  }, [disconnect, setUserInitiated]);

  const value = useMemo(
    () => ({
      wallets: sortWallets(wallets),
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => {
        setModalOpen(false);
        setToast((current) => (current?.kind === "error" ? null : current));
      },
      connectWallet,
      disconnectWallet,
      toast,
      dismissToast: () => setToast(null),
    }),
    [wallets, modalOpen, connectWallet, disconnectWallet, toast, setToast],
  );

  return <WalletUIContext.Provider value={value}>{children}</WalletUIContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWalletUI() {
  return useContext(WalletUIContext);
}
