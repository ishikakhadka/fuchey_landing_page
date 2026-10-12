import { Link } from "react-router";
import { ExternalLink } from "lucide-react";

import { deploymentOf } from "../../config/deployment";
import { NETWORK, explorerAddressUrl } from "../../config/network";
import { useCollection } from "../../hooks/useCollection";
import { shortAddress } from "../../utils/format";

function AddressLink({ address }) {
  return (
    <a href={explorerAddressUrl(address)} target="_blank" rel="noreferrer" title={address}>
      {shortAddress(address, 6)} <ExternalLink size={13} aria-label="(opens Solana Explorer)" />
    </a>
  );
}

// The item's public on-chain references on this network, and the connected
// wallet's own copies (as verified from the chain by the inventory service).
function OnChainRecord({ item }) {
  const deployment = deploymentOf(item);
  const { connected, assets } = useCollection();
  const mine = connected ? assets.filter((a) => a.itemId === item.id) : [];

  const rows = [
    ["Network", <span key="n">{NETWORK.label}{!NETWORK.isMainnet && " (test network)"}</span>],
    ["Fuchey ID", <code key="id">{item.id}</code>],
    ...(deployment
      ? [
          ["Collection", <AddressLink key="c" address={deployment.collection} />],
          ["Candy machine", <AddressLink key="m" address={deployment.candyMachine} />],
        ]
      : []),
  ];

  return (
    <section className="onchain">
      <h2 className="details-heading">On-chain record</h2>
      <dl className="address-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {!deployment && (
        <p className="muted onchain-note">Not deployed on {NETWORK.label} yet, so there’s no collection address to show.</p>
      )}

      {mine.length > 0 && (
        <>
          <h3 className="onchain-sub">Your copies</h3>
          <ul className="onchain-owned">
            {mine.map((a) => (
              <li key={a.address}>
                <Link to={`/collection/${a.address}`}>
                  <span>{a.name}</span>
                  <code>{shortAddress(a.address, 6)}</code>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default OnChainRecord;
