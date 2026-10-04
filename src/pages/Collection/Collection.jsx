import { Link } from "react-router";
import { RefreshCw } from "lucide-react";

import PageHeader from "../../components/marketplace/PageHeader";
import AssetCard from "../../components/collection/AssetCard";
import EmptyState from "../../components/collection/EmptyState";
import ItemArt from "../../components/marketplace/ItemArt";
import WalletButton from "../../components/wallet/WalletButton";
import NetworkBadge from "../../components/wallet/NetworkBadge";

import { useCollection } from "../../hooks/useCollection";
import { useCharacter } from "../../hooks/useCharacters";
import { shortAddress } from "../../utils/format";

function CollectionSection({ title, assets, loading, empty }) {
  return (
    <section className="collection-section">
      <h2 className="details-heading">
        {title} <span className="muted">{loading ? "…" : assets.length}</span>
      </h2>

      {loading && !assets.length ? (
        <div className="asset-grid" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="asset-card is-skeleton" />
          ))}
        </div>
      ) : assets.length ? (
        <div className="asset-grid">
          {assets.map((asset) => (
            <AssetCard key={asset.address} asset={asset} />
          ))}
        </div>
      ) : (
        empty
      )}
    </section>
  );
}

function Collection() {
  const { connected, address, characters, wearables, loading, error, refresh } = useCollection();
  const { character: yeti } = useCharacter("yeti");

  if (!connected) {
    return (
      <div className="container market-page">
        <PageHeader eyebrow="MY COLLECTION" title="Your Fuchey shelf." aside={<NetworkBadge />} />

        <EmptyState
          art={yeti && <ItemArt art={yeti.art} alt="" size="sm" />}
          title="Connect a wallet to see your Fuchey."
          action={<WalletButton />}>
          Your characters and wearables live in your wallet, not on our servers. Connect it and
          we’ll read what you own straight from Solana.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container market-page">
      <PageHeader
        eyebrow="MY COLLECTION"
        title="Your Fuchey shelf."
        aside={
          <div className="collection-aside">
            <NetworkBadge />
            <button type="button" className="icon-button" onClick={refresh} aria-label="Refresh collection">
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
          </div>
        }>
        Fuchey assets owned by <span className="mono">{shortAddress(address)}</span>, read live from
        Solana.
      </PageHeader>

      {error && (
        <p className="market-error">
          Couldn’t read your wallet from Solana right now.{" "}
          <button type="button" className="text-link" onClick={refresh}>
            Try again
          </button>
        </p>
      )}

      <CollectionSection
        title="Characters"
        assets={characters}
        loading={loading}
        empty={
          <EmptyState
            title="No characters yet."
            action={
              <Link to="/characters/yeti" className="primary-button">
                Claim your Yeti
              </Link>
            }>
            Every collection starts with a little friend — the Basic Yeti is free.
          </EmptyState>
        }
      />

      <CollectionSection
        title="Wearables"
        assets={wearables}
        loading={loading}
        empty={
          <EmptyState
            title="Your wardrobe is empty."
            action={
              <Link to="/wardrobe" className="ghost-button">
                Browse the wardrobe
              </Link>
            }
          />
        }
      />
    </div>
  );
}

export default Collection;
