import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Check,
  ChevronDown,
  Copy,
  Droplets,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Wallet,
} from "lucide-react";

import NetworkBadge from "./NetworkBadge";
import { useWallet } from "../../hooks/useWallet";
import { useBalance } from "../../hooks/useBalance";
import { explorerAddressUrl } from "../../config/network";
import { shortAddress } from "../../utils/format";

function WalletMenu({ onClose }) {
  const wallet = useWallet();
  const { balance, loading, error, refresh } = useBalance();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () =>
    navigator.clipboard?.writeText(wallet.address).then(
      () => setCopied(true),
      () => {},
    );

  return (
    <div className="wallet-menu" role="menu" aria-label="Wallet">
      <div className="wallet-menu-head">
        <span className="wallet-menu-name">
          {wallet.walletIcon && <img src={wallet.walletIcon} alt="" width="20" height="20" />}
          {wallet.walletName}
        </span>
        <NetworkBadge />
      </div>

      <button type="button" className="wallet-menu-address" onClick={copy} title={wallet.address}>
        <span className="mono">{shortAddress(wallet.address, 6)}</span>
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span className="sr-only">{copied ? "Copied" : "Copy address"}</span>
      </button>

      <div className="wallet-menu-balance">
        <span>Balance</span>
        <strong>
          {error
            ? "Unavailable"
            : loading || balance == null
              ? "…"
              : `${balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`}
        </strong>
        <button type="button" aria-label="Refresh balance" onClick={refresh}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
        </button>
      </div>

      {wallet.network.faucetUrl && balance === 0 && (
        <a className="wallet-menu-link is-hint" href={wallet.network.faucetUrl} target="_blank" rel="noreferrer">
          <Droplets size={15} /> Get free {wallet.network.label} SOL
        </a>
      )}

      <Link className="wallet-menu-link" to="/collection" role="menuitem" onClick={onClose}>
        <Wallet size={15} /> My Collection
      </Link>

      <a
        className="wallet-menu-link"
        href={explorerAddressUrl(wallet.address)}
        target="_blank"
        rel="noreferrer"
        role="menuitem">
        <ExternalLink size={15} /> View on Explorer
      </a>

      <button
        type="button"
        className="wallet-menu-link is-danger"
        role="menuitem"
        onClick={() => {
          onClose();
          wallet.disconnect();
        }}>
        <LogOut size={15} /> Disconnect
      </button>
    </div>
  );
}

function WalletButton() {
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointer = (e) => !rootRef.current?.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (wallet.connected) {
    return (
      <div className="wallet-root" ref={rootRef}>
        <button
          type="button"
          className="wallet-button is-connected"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}>
          <span className="wallet-dot" aria-hidden="true" />
          <span className="wallet-label">{shortAddress(wallet.address)}</span>
          <ChevronDown size={14} className="wallet-chevron" />
        </button>

        {menuOpen && <WalletMenu onClose={() => setMenuOpen(false)} />}
      </div>
    );
  }

  const busy = wallet.status === "connecting";

  return (
    <button type="button" className="wallet-button" onClick={wallet.openModal}>
      {busy ? <Loader2 size={16} className="spin" /> : <Wallet size={16} strokeWidth={2.2} />}
      <span className="wallet-label">{busy ? "Connecting…" : "Connect Wallet"}</span>
    </button>
  );
}

export default WalletButton;
