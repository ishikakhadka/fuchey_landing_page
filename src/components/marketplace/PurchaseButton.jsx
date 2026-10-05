import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { useWallet } from "../../hooks/useWallet";
import { useListing } from "../../hooks/useListing";
import { useMarketplace } from "../../context/MarketplaceContext";
import { getPurchaseState } from "../../utils/listing";
import { FEATURES } from "../../config/features";

const ICONS = { claim: Sparkles, buy: ArrowRight, owned: Check, soon: Lock, "sold-out": Lock };

// The Buy / Claim button. Clicking it starts a real on-chain purchase through
// the connected wallet (see services/marketplace/mint.js); without a wallet it
// opens the wallet picker instead.
function PurchaseButton({ item, size = "md" }) {
  const wallet = useWallet();
  const live = useListing(item);
  const { startPurchase, purchase } = useMarketplace();

  const state = getPurchaseState(item, {
    connected: wallet.connected,
    live,
    purchasesEnabled: FEATURES.purchases,
  });
  const Icon = ICONS[state.kind] ?? ArrowRight;
  const hintId = `purchase-hint-${item.id}`;
  const busy =
    purchase?.item.id === item.id && ["preparing", "signing", "submitted", "verifying"].includes(purchase.stage);

  const onClick = () => {
    if (state.needsWallet) wallet.openModal();
    else startPurchase(item);
  };

  return (
    <div className={`purchase purchase-${size}`}>
      <button
        type="button"
        className={`purchase-button kind-${state.kind}`}
        disabled={state.disabled || busy}
        aria-label={state.label}
        aria-describedby={state.hint ? hintId : undefined}
        onClick={onClick}>
        <Icon size={size === "lg" ? 18 : 16} strokeWidth={2.2} />
        {size === "sm" ? (state.shortLabel ?? state.label) : state.label}
      </button>

      {state.hint && size === "lg" && (
        <p className="purchase-hint" id={hintId}>
          {state.hint}
        </p>
      )}
    </div>
  );
}

export default PurchaseButton;
