import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { explorerAddressUrl, explorerTxUrl } from "../../config/network";
import { shortAddress } from "./format";

// A Solana address or signature: shortened, with copy-full-value and an
// Explorer link on the record's own network (never assumed mainnet).
function Address({ value, network, tx = false, full = false }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="admin-hint">—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard blocked — the full value is still in the title / link
    }
  };

  return (
    <span className="nft-address">
      <code title={value}>{full ? value : shortAddress(value)}</code>
      <button type="button" className="icon-button" onClick={copy} aria-label={copied ? "Copied" : "Copy full address"} title="Copy">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <a
        className="icon-button"
        href={tx ? explorerTxUrl(value, network) : explorerAddressUrl(value, network)}
        target="_blank"
        rel="noreferrer"
        aria-label="Open in Solana Explorer"
        title="Solana Explorer">
        <ExternalLink size={13} />
      </a>
    </span>
  );
}

export default Address;
