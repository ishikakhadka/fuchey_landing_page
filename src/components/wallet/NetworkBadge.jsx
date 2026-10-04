import { NETWORK } from "../../config/network";

function NetworkBadge() {
  return (
    <span className={`network-badge ${NETWORK.isMainnet ? "is-mainnet" : ""}`}>
      <span className="network-dot" aria-hidden="true" />
      {NETWORK.label}
    </span>
  );
}

export default NetworkBadge;
