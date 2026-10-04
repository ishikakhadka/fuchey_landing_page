import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink, Shirt } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import RarityBadge from "../../components/marketplace/RarityBadge";
import AttributeList from "../../components/characters/AttributeList";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";

import { useAsync } from "../../hooks/useAsync";
import { useWallet } from "../../hooks/useWallet";
import { fetchFucheyAsset, fetchMetadata } from "../../services/nft/assets";
import { findItem } from "../../services/marketplace/catalog";
import { explorerAddressUrl } from "../../config/network";
import { shortAddress } from "../../utils/format";

async function loadAsset(address) {
  const asset = await fetchFucheyAsset(address);
  if (!asset) return null;
  const metadata = await fetchMetadata(asset.uri).catch(() => null);
  return { ...asset, metadata };
}

// One on-chain asset, verified to belong to a Fuchey collection.
function AssetDetails() {
  const { address } = useParams();
  const { address: me } = useWallet();
  const { data: asset, loading, error } = useAsync(() => loadAsset(address), address);

  const back = (
    <Link to="/collection" className="back-link">
      <ArrowLeft size={16} strokeWidth={2.2} /> My collection
    </Link>
  );

  if (loading) {
    return (
      <div className="container market-page" aria-busy="true">
        {back}
        <div className="details-grid">
          <div className="details-stage character-stage stage-companion is-skeleton" />
        </div>
      </div>
    );
  }

  const item = asset && findItem(asset.itemId);

  if (error || !asset || !item) {
    return (
      <div className="container market-page">
        {back}
        <EmptyState title={error ? "Couldn’t reach Solana." : "Not a Fuchey asset."}>
          {error
            ? "Please try again in a moment."
            : "This address isn’t an asset from a Fuchey collection on this network."}
        </EmptyState>
      </div>
    );
  }

  const yours = me && me === asset.owner;
  const rows = [
    ["Asset", asset.address],
    ["Owner", asset.owner],
    ["Collection", asset.collection],
  ];

  return (
    <div className="container market-page character-details">
      {back}

      <div className="details-grid">
        <div className={`details-stage character-stage stage-${item.edition ?? "companion"}`}>
          <span className="stage-chip">{item.kind === "character" ? "Character" : "Wearable"}</span>
          {yours && <span className="stage-chip is-owned">Yours</span>}
          <ItemArt art={item.art} alt={asset.name} itemId={item.id} size="lg" />
          <span className="stage-floor" aria-hidden="true" />
        </div>

        <div className="details-info">
          <div className="details-kicker">
            <RarityBadge rarity={item.rarity} />
            <NetworkBadge />
          </div>

          <h1>{asset.name}</h1>
          <p className="details-tagline">{item.title ?? `Fuchey ${item.name}`}</p>
          <p className="details-desc">{asset.metadata?.description ?? item.description}</p>

          <dl className="address-list">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <a href={explorerAddressUrl(value)} target="_blank" rel="noreferrer" title={value}>
                    {shortAddress(value, 6)} <ExternalLink size={13} />
                  </a>
                </dd>
              </div>
            ))}
          </dl>

          <Link
            to={item.kind === "character" ? "/wardrobe" : `/wardrobe?item=${item.id}`}
            className="ghost-button">
            <Shirt size={16} /> {item.kind === "character" ? "Dress it up" : "Try it on"}
          </Link>
        </div>
      </div>

      {asset.metadata?.attributes?.length > 0 && (
        <div className="details-sections">
          <section>
            <h2 className="details-heading">On-chain attributes</h2>
            <AttributeList attributes={asset.metadata.attributes} />
          </section>
        </div>
      )}
    </div>
  );
}

export default AssetDetails;
