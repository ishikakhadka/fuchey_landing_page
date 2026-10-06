import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import EmptyState from "../../components/collection/EmptyState";
import { NETWORK, networkLabel } from "../../config/network";
import { adminNftList, adminNftSyncAll } from "../../services/backend/admin";
import Address from "./Address";
import { shortAddress, timeAgo } from "./format";
import { NFT_STATUS } from "./nftStatus";

// Every minted Fuchey NFT on the site's network, with its owner as last read
// from the chain. "Sync all" re-reads the chain (and finds copies the
// database hasn't seen); nothing here can set an owner by hand.
function NftRegistry({ session, onOpen }) {
  const [nfts, setNfts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const load = useCallback(
    (isActive = () => true) =>
      adminNftList(session, NETWORK.id).then(
        (r) => isActive() && setNfts(r.nfts),
        (e) => isActive() && setError(e.message),
      ),
    [session],
  );

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const syncAll = async () => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const r = await adminNftSyncAll(session, NETWORK.id);
      setNfts(r.nfts);
      setSummary(r.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unverified = nfts?.filter((n) => n.status === "unverified").length ?? 0;

  return (
    <>
      <div className="admin-toolbar">
        <p className="admin-hint">
          {nfts ? `${nfts.length} minted on ${networkLabel(NETWORK.id)}.` : "Loading…"} Owners are read from Solana; the
          list is a cache of the last read.
        </p>
        <button type="button" className="primary-button" onClick={syncAll} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          {busy ? "Reading blockchain…" : "Sync all"}
        </button>
      </div>

      {error && <p className="admin-error admin-block">{error}</p>}
      {unverified > 0 && !busy && (
        <p className="admin-warn admin-block">
          <TriangleAlert size={14} /> {unverified} NFT{unverified === 1 ? "" : "s"} couldn’t be verified on the last read. The
          owner shown is the last one confirmed.
        </p>
      )}
      {summary && <SyncSummary summary={summary} />}

      {nfts && !nfts.length ? (
        <EmptyState title="No NFTs minted yet.">
          Copies appear here once someone buys a deployed item, or when “Sync all” finds them in a Fuchey collection.
        </EmptyState>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Fuchey asset ID</th>
                <th>NFT asset address</th>
                <th>Collection</th>
                <th>Current owner</th>
                <th>Status</th>
                <th>Network</th>
                <th>Last verified</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(nfts ?? []).map((n) => (
                <tr key={n.id}>
                  <td>
                    <strong>{n.assetName}</strong>
                    {n.name && <span className="admin-hint admin-cell-sub">{n.name}</span>}
                  </td>
                  <td>
                    <code>{n.assetId}</code>
                    <span className="admin-hint admin-cell-sub">{n.assetKind}</span>
                  </td>
                  <td>
                    <Address value={n.assetAddress} network={n.network} />
                  </td>
                  <td>
                    <Address value={n.collectionAddress} network={n.network} />
                  </td>
                  <td>
                    <Address value={n.owner?.wallet} network={n.network} />
                  </td>
                  <td>
                    <span className={`admin-chip ${NFT_STATUS[n.status]?.tone ?? ""}`}>{NFT_STATUS[n.status]?.label ?? n.status}</span>
                  </td>
                  <td>{networkLabel(n.network)}</td>
                  <td title={n.lastVerifiedAt ?? ""}>{timeAgo(n.lastVerifiedAt)}</td>
                  <td>
                    <button type="button" className="ghost-button" onClick={() => onOpen(n.id)}>
                      View <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SyncSummary({ summary }) {
  return (
    <div className="admin-section nft-sync-summary">
      <p className="admin-ok">
        Checked {summary.checked} NFT{summary.checked === 1 ? "" : "s"} on-chain · {summary.owned} owned
        {summary.discovered ? ` · ${summary.discovered} newly found` : ""}
        {summary.burned ? ` · ${summary.burned} burned` : ""}
        {summary.unverified ? ` · ${summary.unverified} unverified` : ""}
      </p>
      {summary.changes.length > 0 && (
        <>
          <h3>Ownership changed</h3>
          <ul className="nft-changes">
            {summary.changes.map((c) => (
              <li key={c.nftId}>
                <code>{c.assetId}</code> <code title={c.assetAddress}>{shortAddress(c.assetAddress)}</code>:{" "}
                <code title={c.previous ?? ""}>{shortAddress(c.previous)}</code> <ArrowRight size={12} />{" "}
                {c.current ? <code title={c.current}>{shortAddress(c.current)}</code> : "burned"}
              </li>
            ))}
          </ul>
        </>
      )}
      {summary.errors.map((e) => (
        <p key={e} className="admin-warn">
          {e}
        </p>
      ))}
    </div>
  );
}

export default NftRegistry;
