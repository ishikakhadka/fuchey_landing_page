import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useWalletUI } from "../../context/WalletContext";

const DURATION = 5000;

function WalletToast() {
  const { toast, dismissToast, modalOpen } = useWalletUI();

  // Errors shown inside the open picker stay until it closes or the user retries.
  useEffect(() => {
    if (!toast || modalOpen) return;
    const timer = setTimeout(dismissToast, DURATION);
    return () => clearTimeout(timer);
    // Restart the timer per toast, not when the callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id, modalOpen]);

  // The picker is a native modal dialog (top layer), so a toast would sit
  // behind it; WalletModal shows errors inline while it is open.
  if (!toast || modalOpen) return null;

  const Icon = toast.kind === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`wallet-toast is-${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      key={toast.id}>
      <Icon size={20} />
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" aria-label="Dismiss" onClick={dismissToast}>
        <X size={16} />
      </button>
    </div>
  );
}

export default WalletToast;
