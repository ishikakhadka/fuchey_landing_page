import { useEffect, useRef } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { AlertCircle, ArrowUpRight, Loader2, ShieldCheck, X } from "lucide-react";

import NetworkBadge from "./NetworkBadge";
import { useWallet } from "../../hooks/useWallet";
import { useWalletUI } from "../../context/WalletContext";

const READY_LABEL = {
  [WalletReadyState.Installed]: "Detected",
  [WalletReadyState.Loadable]: "Web & mobile",
  [WalletReadyState.NotDetected]: "Install",
};

function WalletModal() {
  const { modalOpen, closeModal, toast } = useWalletUI();
  const error = toast?.kind === "error" ? toast : null;
  const { wallets, connect, status, walletName, network } = useWallet();
  const dialogRef = useRef(null);

  // Drive the native <dialog> (focus trap, Esc, inert page) from state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (modalOpen && !dialog.open) dialog.showModal();
    if (!modalOpen && dialog.open) dialog.close();
  }, [modalOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="wallet-modal"
      aria-labelledby="wallet-modal-title"
      onClose={closeModal}
      onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="wallet-modal-card">
        <button type="button" className="wallet-modal-close" aria-label="Close" onClick={closeModal}>
          <X size={18} />
        </button>

        <p className="eyebrow">CONNECT</p>
        <h2 id="wallet-modal-title">Pick a wallet</h2>
        <p className="wallet-modal-lede">
          <ShieldCheck size={16} strokeWidth={2} />
          Your keys stay in your wallet. Fuchey only sees your public address.
        </p>

        {error && (
          <div className="wallet-modal-error" role="alert" key={error.id}>
            <AlertCircle size={18} />
            <div>
              <strong>{error.title}</strong>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        <ul className="wallet-list">
          {wallets.map(({ adapter, readyState }) => {
            const waiting = status === "connecting" && walletName === adapter.name;
            const install = readyState === WalletReadyState.NotDetected;

            return (
              <li key={adapter.name}>
                <button
                  type="button"
                  className={`wallet-option ${waiting ? "is-waiting" : ""}`}
                  onClick={() => connect(adapter.name)}
                  disabled={status === "connecting"}>
                  <img src={adapter.icon} alt="" width="36" height="36" />

                  <span className="wallet-option-name">
                    {adapter.name}
                  </span>

                  <span className="wallet-option-state">
                    {waiting ? (
                      <>
                        <Loader2 size={14} className="spin" /> Approve in wallet
                      </>
                    ) : (
                      <>
                        {READY_LABEL[readyState] ?? ""}
                        {install && <ArrowUpRight size={14} />}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="wallet-modal-foot">
          <NetworkBadge />
          <p>
            {network.isMainnet
              ? "Transactions use real SOL."
              : `Set your wallet to ${network.label} too. Test SOL only — it has no real value.`}
          </p>
        </div>
      </div>
    </dialog>
  );
}

export default WalletModal;
