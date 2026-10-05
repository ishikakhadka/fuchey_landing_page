import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { AlertCircle, Check, ExternalLink, Loader2, PenLine, Sparkles } from "lucide-react";

import ItemArt from "./ItemArt";
import { useMarketplace } from "../../context/MarketplaceContext";
import { useWallet } from "../../hooks/useWallet";
import { explorerTxUrl } from "../../config/network";
import { formatSol } from "../../utils/format";

const STEPS = [
  { id: "preparing", label: "Prepare" },
  { id: "signing", label: "Approve" },
  { id: "submitted", label: "Confirm" },
  { id: "verifying", label: "Verify" },
];
const ORDER = ["preparing", "signing", "submitted", "verifying", "confirmed"];
const IN_FLIGHT = ["preparing", "signing", "submitted", "verifying"];

function StepBar({ stage }) {
  const current = ORDER.indexOf(stage);
  return (
    <ol className="tx-steps">
      {STEPS.map((step, i) => {
        const done = current > i || stage === "confirmed";
        const active = current === i;
        return (
          <li key={step.id} className={done ? "is-done" : active ? "is-active" : ""}>
            <span className="tx-step-dot">{done ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function PurchaseDialog() {
  const { purchase, closePurchase, startPurchase } = useMarketplace();
  const { walletName } = useWallet();
  const dialogRef = useRef(null);
  const open = Boolean(purchase);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const inFlight = purchase && IN_FLIGHT.includes(purchase.stage);
  const item = purchase?.item;
  const free = item?.listing.price === 0;

  let body = null;

  if (purchase) {
    const { stage, signature, error } = purchase;

    if (stage === "preparing") {
      body = (
        <>
          <h2>Getting things ready…</h2>
          <p>Checking supply and your balance before anything goes to your wallet.</p>
        </>
      );
    } else if (stage === "signing") {
      body = (
        <>
          <h2>
            <PenLine size={20} /> Approve in {walletName ?? "your wallet"}
          </h2>
          <p>
            Review the transaction in your wallet.{" "}
            {free ? "It’s free — you only pay a tiny network fee." : `You’ll pay ${formatSol(item.listing.price)} plus a small network fee.`}
          </p>
        </>
      );
    } else if (stage === "submitted") {
      body = (
        <>
          <h2>Transaction submitted</h2>
          <p>Waiting for Solana to confirm it. This usually takes a few seconds.</p>
        </>
      );
    } else if (stage === "verifying") {
      body = (
        <>
          <h2>Confirmed — verifying ownership</h2>
          <p>Checking on Solana that the new {item.name} is in your wallet.</p>
        </>
      );
    } else if (stage === "confirmed") {
      body = (
        <>
          <h2 className="tx-success">
            <Sparkles size={20} /> {item.name} added to your collection!
          </h2>
          <p>Confirmed on Solana and verified. It’s in your wallet now.</p>
        </>
      );
    } else if (stage === "error") {
      body = (
        <>
          <h2 className="tx-error">
            <AlertCircle size={20} /> {error.title}
          </h2>
          <p>{error.message}</p>
        </>
      );
    }

    body = (
      <>
        {body}
        {signature && (
          <a className="text-link tx-link" href={explorerTxUrl(signature)} target="_blank" rel="noreferrer">
            View transaction <ExternalLink size={14} />
          </a>
        )}
      </>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="tx-dialog"
      aria-labelledby="tx-title"
      onCancel={(e) => {
        e.preventDefault();
        closePurchase();
      }}
      onClick={(e) => e.target === e.currentTarget && closePurchase()}>
      {purchase && (
        <div className={`tx-card stage-${purchase.stage}`} key={purchase.id}>
          <div className={`tx-art character-stage stage-${item.edition ?? "companion"}`}>
            <ItemArt art={item.art} alt={item.title ?? item.name} itemId={item.id} size="md" />
            {inFlight && <Loader2 className="tx-spinner spin" size={22} />}
          </div>

          <div className="tx-body" id="tx-title">
            <p className="eyebrow">{free ? "CLAIM" : "PURCHASE"}</p>
            {purchase.stage !== "error" && <StepBar stage={purchase.stage} />}
            {body}
          </div>

          <div className="tx-actions">
            {purchase.stage === "confirmed" && (
              <>
                <Link
                  to={purchase.asset ? `/collection/${purchase.asset}` : "/collection"}
                  className="primary-button"
                  onClick={closePurchase}>
                  View in collection
                </Link>
                <button type="button" className="ghost-button" onClick={closePurchase}>
                  Keep browsing
                </button>
              </>
            )}

            {purchase.stage === "error" && (
              <>
                {!["limit-reached", "sold-out", "not-deployed"].includes(purchase.error.code) && (
                  <button type="button" className="primary-button" onClick={() => startPurchase(item)}>
                    Try again
                  </button>
                )}
                <button type="button" className="ghost-button" onClick={closePurchase}>
                  Close
                </button>
              </>
            )}

            {inFlight && <p className="tx-note">Keep this tab open until it’s confirmed.</p>}
          </div>
        </div>
      )}
    </dialog>
  );
}

export default PurchaseDialog;
