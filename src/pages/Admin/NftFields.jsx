import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, ExternalLink, FileJson, Loader2, Sparkles, X } from "lucide-react";

import { NETWORK, explorerAddressUrl, explorerTxUrl } from "../../config/network";
import { useWallet } from "../../hooks/useWallet";
import { adminNft } from "../../services/backend/admin";
import { deployProduct, updateSale } from "../../services/nft/deploy";
import { Section } from "./fields";

// The NFT side of an asset, on the network the site runs on:
//
//   not-configured → ready → uploading → metadata-created → minting → minted
//   (or failed)  →  listing: draft → active ⇄ paused → ended
//
// "Mint" deploys the asset's Metaplex Core collection + candy machine (edition
// size = supply); each purchase then mints a copy to the buyer. Every on-chain
// step: the backend issues a plan → the admin's own wallet builds, signs and
// sends it (no keys on any server) → the backend verifies the result on-chain
// and only then saves it.

const STATUS = {
  "not-configured": { label: "Not configured", tone: "" },
  ready: { label: "Ready for metadata", tone: "" },
  uploading: { label: "Uploading…", tone: "" },
  "metadata-created": { label: "Metadata generated", tone: "is-ok" },
  minting: { label: "Minting…", tone: "" },
  minted: { label: "Minted", tone: "is-live" },
  failed: { label: "Failed", tone: "is-bad" },
};
const SALE = { draft: "Not listed", active: "Active", paused: "Paused", ended: "Ended" };

const short = (s) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : "—");

function Addr({ label, value, tx }) {
  if (!value) return null;
  return (
    <div className="nft-addr">
      <dt>{label}</dt>
      <dd>
        <a href={tx ? explorerTxUrl(value) : explorerAddressUrl(value)} target="_blank" rel="noreferrer" title={value}>
          <code>{short(value)}</code> <ExternalLink size={12} />
        </a>
      </dd>
    </div>
  );
}

// Retries a confirm call while the chain catches up with what we just sent.
async function confirmWithRetry(call, attempts = 6) {
  for (let i = 0; ; i++) {
    try {
      return await call(i === attempts - 1);
    } catch (error) {
      if (error.status !== 409 || i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

function NftFields({ kind, id, isNew, dirty, session }) {
  const wallet = useWallet();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null); // progress text while an action runs
  const [error, setError] = useState(null); // { message, details }
  const [json, setJson] = useState(null); // metadata shown in the preview
  const [sale, setSale] = useState({ price: "", limit: "" });

  const base = { kind, id, network: NETWORK.id };

  // Loads the current state; `isActive` guards against a stale response.
  const load = useCallback(
    (isActive = () => true) =>
      adminNft(session, "nftStatus", { kind, id, network: NETWORK.id }).then(
        (next) => {
          if (!isActive()) return;
          setData(next);
          setSale({
            price: String(next.listing?.price ?? next.live?.price ?? ""),
            limit: next.listing?.limit_per_wallet ? String(next.listing.limit_per_wallet) : "",
          });
        },
        (e) => isActive() && setError({ message: e.message, details: e.details }),
      ),
    [session, kind, id],
  );

  useEffect(() => {
    let active = true;
    if (!isNew && id) load(() => active);
    return () => {
      active = false;
    };
  }, [load, isNew, id]);

  const refresh = () => load();

  const run = async (label, fn) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError({ message: e.message ?? "Something went wrong.", details: e.details });
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const preview = () =>
    run("Building preview…", async () => {
      const { metadata } = await adminNft(session, "previewMetadata", base);
      setJson(metadata);
    });

  const generate = () =>
    run("Uploading artwork and metadata to IPFS…", async () => {
      const next = await adminNft(session, "generateMetadata", base);
      setJson(next.nft?.metadata ?? null);
    });

  // Backend plan → admin's wallet builds, signs, sends → backend verifies.
  const onChain = (prepareAction, confirmAction, payload, send, labels) =>
    run(labels.preparing, async () => {
      const { plan } = await adminNft(session, prepareAction, { ...base, ...payload });
      const stage = (s) => setBusy(s === "signing" ? labels.signing : "Sending to Solana…");
      const result = await send(wallet.signer, plan, stage);
      setBusy("Verifying on-chain…");
      await confirmWithRetry((final) =>
        adminNft(session, confirmAction, { ...base, ...result, signature: result.signatures.at(-1), final }),
      );
    });

  const mint = () =>
    onChain("prepareMint", "confirmMint", {}, deployProduct, {
      preparing: "Preparing the deployment…",
      signing: "Approve the transactions in your wallet…",
    });

  const setSaleState = (state) => {
    if (state === "ended" && !window.confirm("End this sale? No more copies can be bought until you open it again.")) return;
    onChain("prepareSale", "confirmSale", { state, price: sale.price, limitPerWallet: sale.limit || null }, updateSale, {
      preparing: "Preparing the listing change…",
      signing: "Approve the listing change in your wallet…",
    });
  };

  const header = (
    <span className={`admin-chip ${STATUS[data?.status]?.tone ?? ""}`}>{STATUS[data?.status]?.label ?? "…"}</span>
  );

  if (isNew) {
    return (
      <Section title="NFT (Metaplex Core)" aside={<span className="admin-chip">Not saved</span>}>
        <p className="admin-note is-wide">Save the asset first. Its NFT is created from the saved version.</p>
      </Section>
    );
  }

  const nft = data?.nft ?? {};
  const status = data?.status;
  const listing = data?.listing;
  const live = data?.live;
  const minted = status === "minted";
  const canGenerate = ["not-configured", "ready", "failed", "metadata-created"].includes(status) && !minted;
  const canMint = (status === "metadata-created" || (status === "failed" && nft.metadataUri) || status === "minting") && !minted;
  const wrongWallet = minted && nft.authority && wallet.address && nft.authority !== wallet.address;
  const disabled = Boolean(busy) || dirty;

  const checks = data && [
    { ok: !data.problems.some((p) => p.startsWith("image_url")), label: "Artwork" },
    { ok: !data.problems.some((p) => !p.startsWith("image_url")), label: "Details & attributes" },
    { ok: data.storageConfigured, label: "IPFS storage" },
    { ok: Boolean(nft.metadataUri), label: "Metadata" },
    { ok: minted, label: "On-chain" },
    { ok: listing?.status === "active", label: "Listed" },
  ];

  return (
    <Section title="NFT (Metaplex Core)" aside={header}>
      <dl className="nft-facts is-wide">
        <div>
          <dt>Network</dt>
          <dd>{NETWORK.label}</dd>
        </div>
        <div>
          <dt>Collection</dt>
          <dd>{data?.collectionGroup?.name ?? "…"}</dd>
        </div>
        <div>
          <dt>Token standard</dt>
          <dd>Metaplex Core · minted on purchase</dd>
        </div>
      </dl>

      {checks && (
        <ul className="nft-checks is-wide">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "is-ok" : ""}>
              {c.ok ? <Check size={14} /> : <X size={14} />} {c.label}
            </li>
          ))}
        </ul>
      )}

      {dirty && <p className="admin-warn is-wide">You have unsaved changes. Save first: the NFT is built from the saved asset.</p>}
      {data && !data.storageConfigured && !minted && (
        <p className="admin-warn is-wide">
          IPFS storage isn’t configured yet. Set the <code>PINATA_JWT</code> secret on the Supabase project.
        </p>
      )}
      {data?.problems?.length > 0 && !minted && (
        <ul className="nft-problems is-wide">
          {data.problems.map((p) => (
            <li key={p}>
              <CircleAlert size={13} /> {p.replace(/^\w+: /, "")}
            </li>
          ))}
        </ul>
      )}

      {nft.metadataUri && (
        <dl className="nft-facts is-wide">
          <div>
            <dt>Artwork</dt>
            <dd>
              <a href={nft.imageUrl} target="_blank" rel="noreferrer">
                <code>{nft.imageUri}</code>
              </a>
            </dd>
          </div>
          <div>
            <dt>Metadata URI</dt>
            <dd>
              <a href={nft.metadataUrl} target="_blank" rel="noreferrer">
                <code>{nft.metadataUri}</code>
              </a>
            </dd>
          </div>
        </dl>
      )}

      {minted && (
        <dl className="nft-facts is-wide">
          <Addr label="Collection address" value={nft.collection} />
          <Addr label="Candy machine" value={nft.candyMachine} />
          <Addr label="Authority (your admin wallet)" value={nft.authority} />
          <Addr label="Payments to" value={nft.treasury} />
          <Addr label="Deploy transaction" value={nft.transactionSignature} tx />
        </dl>
      )}

      {minted && live && (
        <dl className="nft-facts nft-supply is-wide">
          <div>
            <dt>Price</dt>
            <dd>{live.price === 0 ? "Free" : `${live.price} SOL`}</dd>
          </div>
          <div>
            <dt>Supply</dt>
            <dd>{live.supply}</dd>
          </div>
          <div>
            <dt>Minted</dt>
            <dd>{live.minted}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{live.remaining}</dd>
          </div>
          <div>
            <dt>Listing</dt>
            <dd>{SALE[listing?.status] ?? "Not listed"}</dd>
          </div>
        </dl>
      )}

      {nft.error && status === "failed" && <p className="admin-error is-wide">Last attempt failed: {nft.error}</p>}

      {!minted && (
        <div className="admin-field is-wide">
          <div className="admin-inline">
            <button type="button" className="ghost-button" onClick={preview} disabled={Boolean(busy)}>
              <FileJson size={15} /> Preview metadata
            </button>
            {canGenerate && (
              <button type="button" className="ghost-button" onClick={generate} disabled={disabled || data?.problems?.length > 0}>
                {nft.metadataUri ? "Regenerate metadata" : "Generate metadata"}
              </button>
            )}
            {canMint && (
              <button
                type="button"
                className="primary-button"
                onClick={mint}
                disabled={disabled || !wallet.can.signTransaction}>
                <Sparkles size={15} /> {status === "minting" ? "Retry mint" : `Mint on ${NETWORK.label}`}
              </button>
            )}
          </div>
          {canMint && (
            <p className="admin-hint">
              Your wallet approves the transactions that create the collection and candy machine (it pays the network
              rent, about 0.01–0.02 SOL). Each buyer then mints their own copy. Supply and metadata are fixed once minted.
            </p>
          )}
        </div>
      )}

      {minted && (
        <div className="admin-field is-wide">
          <span className="admin-label">Listing</span>
          <div className="admin-inline nft-sale">
            <label>
              Price (SOL)
              <input type="number" min="0" step="any" value={sale.price} onChange={(e) => setSale((s) => ({ ...s, price: e.target.value }))} />
            </label>
            <label>
              Limit per wallet
              <input type="number" min="1" step="1" placeholder="none" value={sale.limit} onChange={(e) => setSale((s) => ({ ...s, limit: e.target.value }))} />
            </label>
          </div>
          <div className="admin-inline">
            {listing?.status !== "active" && (
              <button type="button" className="primary-button" onClick={() => setSaleState("active")} disabled={disabled || wrongWallet}>
                {listing?.status === "paused" || listing?.status === "ended" ? "Reopen sale" : "Open sale"}
              </button>
            )}
            {listing?.status === "active" && (
              <>
                <button type="button" className="ghost-button" onClick={() => setSaleState("active")} disabled={disabled || wrongWallet}>
                  Update listing
                </button>
                <button type="button" className="ghost-button" onClick={() => setSaleState("paused")} disabled={disabled || wrongWallet}>
                  Pause sale
                </button>
              </>
            )}
            {listing && listing.status !== "ended" && (
              <button type="button" className="ghost-button is-danger" onClick={() => setSaleState("ended")} disabled={disabled || wrongWallet}>
                End sale
              </button>
            )}
          </div>
          <p className="admin-hint">
            Each change updates the candy guard on-chain (approved in your wallet), so the price and open/closed state
            are enforced by Solana, not by this site.
          </p>
          {wrongWallet && (
            <p className="admin-warn">Only the wallet that minted this item ({short(nft.authority)}) can change its sale.</p>
          )}
        </div>
      )}

      {busy && (
        <p className="admin-hint is-wide nft-busy">
          <Loader2 size={14} className="spin" /> {busy}
        </p>
      )}
      {error && (
        <div className="is-wide">
          <p className="admin-error">{error.message}</p>
          {error.details?.map?.((d) => (
            <p key={d} className="admin-error">
              • {d}
            </p>
          ))}
        </div>
      )}

      {json && (
        <div className="admin-field is-wide">
          <div className="admin-inline">
            <span className="admin-label">Metadata JSON</span>
            <button type="button" className="text-link" onClick={() => setJson(null)}>
              Hide
            </button>
          </div>
          <pre className="nft-json">{JSON.stringify(json, null, 2)}</pre>
        </div>
      )}
    </Section>
  );
}

export default NftFields;
