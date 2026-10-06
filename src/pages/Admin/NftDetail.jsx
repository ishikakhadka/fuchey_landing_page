import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import { networkLabel } from "../../config/network";
import { adminNftDetail, adminNftSync } from "../../services/backend/admin";
import Address from "./Address";
import { Section } from "./fields";
import { timeAgo } from "./format";
import { ACQUISITION, NFT_STATUS } from "./nftStatus";

// One minted NFT: identities, current owner (as last read from the chain),
// ownership history, metadata and Explorer links. "Sync ownership" re-reads
// the asset account; a changed owner is shown, never applied silently.
//
//   Fuchey asset ID    internal identity ("yeti")
//   NFT asset address  the Core asset on-chain
//   Collection         the product's Core collection
//   Owner              a wallet address (any wallet app)
//   Listing            the product's sale state — not ownership

const when = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

function Fact({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function NftDetail({ session, id, onClose }) {
  const [nft, setNft] = useState(null);
  const [error, setError] = useState(null);
  const [sync, setSync] = useState(null); // { stage: "reading" } | { stage: "done", result }

  const load = useCallback(
    (isActive = () => true) =>
      adminNftDetail(session, id).then(
        (r) => isActive() && setNft(r.nft),
        (e) => isActive() && setError(e.message),
      ),
    [session, id],
  );

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const syncOwnership = async () => {
    setError(null);
    setSync({ stage: "reading" });
    try {
      const r = await adminNftSync(session, id);
      setNft(r.nft);
      setSync({ stage: "done", result: r.result });
    } catch (e) {
      setSync(null);
      setError(e.message);
    }
  };

  const back = (
    <button type="button" className="back-link" onClick={onClose}>
      <ArrowLeft size={16} /> All NFTs
    </button>
  );

  if (!nft) {
    return (
      <div className="admin-editor">
        <div className="admin-editor-head">{back}</div>
        {error ? <p className="admin-error">{error}</p> : <p className="admin-hint">Loading…</p>}
      </div>
    );
  }

  const status = NFT_STATUS[nft.status] ?? { label: nft.status, tone: "" };
  const meta = nft.metadataJson ?? {};
  const result = sync?.stage === "done" ? sync.result : null;

  return (
    <div className="admin-editor">
      <div className="admin-editor-head">
        {back}
        <h2>{nft.name || nft.assetName}</h2>
        <span className={`admin-chip ${status.tone}`}>{status.label}</span>
        <span className="admin-spacer" />
        <button type="button" className="primary-button" onClick={syncOwnership} disabled={sync?.stage === "reading"}>
          {sync?.stage === "reading" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          {sync?.stage === "reading" ? "Reading blockchain…" : "Sync ownership"}
        </button>
      </div>

      {error && <p className="admin-error admin-block">{error}</p>}
      {result && <SyncResult result={result} lastVerifiedAt={nft.lastVerifiedAt} />}
      {nft.status === "unverified" && !result && (
        <p className="admin-warn admin-block">
          <TriangleAlert size={14} /> Ownership could not be verified{nft.verifyError ? ` (${nft.verifyError})` : ""}. Last
          verified: {timeAgo(nft.lastVerifiedAt)}.
        </p>
      )}

      <div className="admin-form">
        <Section title="Basic information">
          <dl className="nft-facts is-wide">
            <Fact label="Fuchey asset">{nft.assetName}</Fact>
            <Fact label="Fuchey asset ID">
              <code>{nft.assetId}</code> · {nft.assetKind}
            </Fact>
            <Fact label="NFT asset address">
              <Address value={nft.assetAddress} network={nft.network} full />
            </Fact>
            <Fact label="Collection address">
              <Address value={nft.collectionAddress} network={nft.network} full />
            </Fact>
            <Fact label="Network">
              {networkLabel(nft.network)} · {nft.chain}
            </Fact>
            <Fact label="Status">{status.label}</Fact>
            <Fact label="Minted">{when(nft.mintedAt)}</Fact>
            <Fact label="Mint transaction">
              <Address value={nft.mintSignature} network={nft.network} tx />
            </Fact>
          </dl>
        </Section>

        <Section title="Ownership">
          {nft.owner ? (
            <dl className="nft-facts is-wide">
              <Fact label="Current owner">
                <Address value={nft.owner.wallet} network={nft.network} full />
              </Fact>
              <Fact label="First seen">{when(nft.owner.firstSeenAt)}</Fact>
              <Fact label="Last verified">
                <span title={nft.lastVerifiedAt ?? ""}>{timeAgo(nft.lastVerifiedAt)}</span>
              </Fact>
              <Fact label="Acquired through">{ACQUISITION[nft.owner.source] ?? nft.owner.source}</Fact>
              <Fact label="Acquired">{when(nft.owner.acquiredAt)}</Fact>
              <Fact label="Acquisition transaction">
                <Address value={nft.owner.signature} network={nft.network} tx />
              </Fact>
            </dl>
          ) : (
            <p className="admin-note is-wide">
              {nft.status === "burned" ? "This NFT was burned; nobody owns it." : "No owner has been read from the chain yet."}
            </p>
          )}

          {nft.history.length > 1 && (
            <div className="admin-table-wrap is-wide">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Acquired through</th>
                    <th>First seen</th>
                    <th>Until</th>
                  </tr>
                </thead>
                <tbody>
                  {nft.history.map((p) => (
                    <tr key={`${p.wallet}-${p.firstSeenAt}`}>
                      <td>
                        <Address value={p.wallet} network={nft.network} />
                      </td>
                      <td>{ACQUISITION[p.source] ?? p.source}</td>
                      <td>{when(p.firstSeenAt)}</td>
                      <td>{p.endedAt ? `${when(p.endedAt)} (${p.endedReason})` : "current"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Metadata">
          <dl className="nft-facts is-wide">
            <Fact label="Metadata URI">
              {nft.metadataUri ? (
                <a href={nft.metadataUri} target="_blank" rel="noreferrer">
                  <code>{nft.metadataUri}</code>
                </a>
              ) : (
                "—"
              )}
            </Fact>
            <Fact label="Name">{meta.name ?? nft.name ?? "—"}</Fact>
            <Fact label="Description">{meta.description || "—"}</Fact>
          </dl>
          {Array.isArray(meta.attributes) && meta.attributes.length > 0 && (
            <ul className="nft-checks is-wide">
              {meta.attributes.map((a) => (
                <li key={a.trait_type}>
                  {a.trait_type}: <strong>{a.value}</strong>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Listing">
          {nft.listing ? (
            <dl className="nft-facts is-wide">
              <Fact label="Sale status">{nft.listing.status}</Fact>
              <Fact label="Price">
                {nft.listing.price} {nft.listing.currency}
              </Fact>
              <Fact label="Paid to">
                <Address value={nft.listing.seller_wallet} network={nft.network} />
              </Fact>
              <Fact label="Candy machine">
                <Address value={nft.listing.candy_machine} network={nft.network} />
              </Fact>
            </dl>
          ) : (
            <p className="admin-note is-wide">No listing for this product.</p>
          )}
          <p className="admin-hint is-wide">
            The listing is the product’s sale state (each purchase mints a new copy). It never decides who owns this NFT.
          </p>
        </Section>
      </div>
    </div>
  );
}

function SyncResult({ result, lastVerifiedAt }) {
  if (result.status === "unverified") {
    return (
      <p className="admin-warn admin-block">
        <TriangleAlert size={14} /> Ownership could not be verified{result.error ? ` (${result.error})` : ""}. Last verified:{" "}
        {timeAgo(lastVerifiedAt)}. The owner shown is the last one confirmed.
      </p>
    );
  }
  if (result.changed) {
    return (
      <div className="admin-section nft-sync-summary">
        <h3>Ownership changed</h3>
        <dl className="nft-facts">
          <Fact label="Previous">
            <code>{result.previous}</code>
          </Fact>
          <Fact label="Current">{result.current ? <code>{result.current}</code> : "Burned"}</Fact>
        </dl>
        <p className="admin-hint">
          <ArrowRight size={12} /> Read from the chain and saved; the old owner is kept in the history below.
        </p>
      </div>
    );
  }
  return (
    <p className="admin-ok admin-block">
      <Check size={14} /> {result.status === "burned" ? "Burn confirmed on-chain." : "Owner verified on-chain"} · database
      updated · last verified: just now
    </p>
  );
}

export default NftDetail;
