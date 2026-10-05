import { useState } from "react";
import { NETWORK, explorerAddressUrl } from "../../config/network";
import { getReadUmi } from "../../services/solana/umi";
import { Section, TextInput, NumberInput } from "./fields";

const NETWORKS = [
  { id: "devnet", label: "Devnet" },
  { id: "mainnet-beta", label: "Mainnet" },
];

// Reads the referenced accounts from Solana, so an address that doesn't
// exist (or isn't a Core collection / candy machine) is caught before
// publishing. Only possible for the network the site is running on.
async function checkOnChain(entry) {
  const umi = await getReadUmi();
  const [{ safeFetchCollectionV1 }, { safeFetchCandyMachine }, { publicKey, isPublicKey }] = await Promise.all([
    import("@metaplex-foundation/mpl-core"),
    import("@metaplex-foundation/mpl-core-candy-machine"),
    import("@metaplex-foundation/umi"),
  ]);
  const out = [];

  if (entry.collection) {
    const c = isPublicKey(entry.collection) ? await safeFetchCollectionV1(umi, publicKey(entry.collection)) : null;
    out.push(
      c
        ? { ok: true, text: `Collection “${c.name}” found (${c.numMinted} minted).` }
        : { ok: false, text: "No Metaplex Core collection at that address." },
    );
  }
  if (entry.candyMachine) {
    const m = isPublicKey(entry.candyMachine) ? await safeFetchCandyMachine(umi, publicKey(entry.candyMachine)) : null;
    if (!m) out.push({ ok: false, text: "No Core Candy Machine at that address." });
    else {
      const matches = m.collectionMint.toString() === entry.collection;
      out.push({
        ok: matches,
        text: matches
          ? `Candy machine found: ${Number(m.itemsRedeemed)} / ${Number(m.data.itemsAvailable)} minted.`
          : "Candy machine belongs to a different collection.",
      });
    }
  }
  if (!out.length) out.push({ ok: false, text: "Nothing to check — add a collection address." });
  return out;
}

// item.nft = { [network]: { collection, candyMachine, candyGuard, treasury, metadataUri, imageUri, mintLimitId } }
function NftFields({ nft = {}, onChange, errors }) {
  const [network, setNetwork] = useState(NETWORK.id);
  const [check, setCheck] = useState({ network: null, results: null, busy: false });
  const entry = nft[network] ?? {};
  const set = (key) => (value) => onChange({ ...nft, [network]: { ...entry, [key]: value || null } });
  const p = (key) => `nft.${network}.${key}`;

  const runCheck = async () => {
    setCheck({ network, results: null, busy: true });
    try {
      setCheck({ network, results: await checkOnChain(entry), busy: false });
    } catch (error) {
      setCheck({ network, results: [{ ok: false, text: error.message ?? "Couldn’t reach Solana." }], busy: false });
    }
  };

  return (
    <Section
      title="NFT (Metaplex Core)"
      aside={
        <div className="admin-tabs" role="group" aria-label="Network">
          {NETWORKS.map((n) => (
            <button key={n.id} type="button" aria-pressed={n.id === network} onClick={() => setNetwork(n.id)}>
              {n.label}
            </button>
          ))}
        </div>
      }>
      <p className="admin-note is-wide">
        Listing an item never mints anything. These are references to a collection and candy machine that already
        exist on {NETWORKS.find((n) => n.id === network).label} (e.g. created with <code>nft/setup-marketplace.mjs</code>).
        Buying stays disabled until the collection, candy machine and candy guard are set. Price and supply changes
        here don’t update the candy guard on-chain.
      </p>

      <TextInput label="Collection address" value={entry.collection} onChange={set("collection")} errors={errors} path={p("collection")} spellCheck={false} />
      <TextInput label="Candy machine" value={entry.candyMachine} onChange={set("candyMachine")} errors={errors} path={p("candyMachine")} spellCheck={false} />
      <TextInput label="Candy guard" value={entry.candyGuard} onChange={set("candyGuard")} errors={errors} path={p("candyGuard")} spellCheck={false} />
      <TextInput label="Treasury (payments)" value={entry.treasury} onChange={set("treasury")} errors={errors} path={p("treasury")} spellCheck={false} />
      <TextInput label="Metadata URI" value={entry.metadataUri} onChange={set("metadataUri")} errors={errors} path={p("metadataUri")} wide />
      <TextInput label="NFT image URI" value={entry.imageUri} onChange={set("imageUri")} errors={errors} path={p("imageUri")} wide />
      <NumberInput label="Mint-limit guard id" value={entry.mintLimitId} onChange={set("mintLimitId")} errors={errors} path={p("mintLimitId")} step="1" hint="Only if the candy guard has a per-wallet mintLimit." />

      <div className="admin-field is-wide">
        <div className="admin-inline">
          <button
            type="button"
            className="ghost-button"
            disabled={network !== NETWORK.id || check.busy}
            onClick={runCheck}>
            {check.busy ? "Checking…" : "Check on-chain"}
          </button>
          {entry.collection && (
            <a className="text-link" href={explorerAddressUrl(entry.collection)} target="_blank" rel="noreferrer">
              View collection ↗
            </a>
          )}
          {network !== NETWORK.id && <span className="admin-hint">The site is running on {NETWORK.label}.</span>}
        </div>
        {check.network === network &&
          check.results?.map((r) => (
            <p key={r.text} className={r.ok ? "admin-ok" : "admin-error"}>
              {r.ok ? "✓" : "✕"} {r.text}
            </p>
          ))}
      </div>
    </Section>
  );
}

export default NftFields;
