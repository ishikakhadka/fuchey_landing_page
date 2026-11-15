import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import PackCard from "../../components/characters/PackCard";
import ItemArt from "../../components/marketplace/ItemArt";
import RarityBadge from "../../components/marketplace/RarityBadge";
import DropBanner from "../../components/drops/DropBanner";
import WalletButton from "../../components/wallet/WalletButton";
import { usePacks } from "../../hooks/useCharacters";
import { useCollection } from "../../hooks/useCollection";
import { useCatalog } from "../../context/CatalogContext";
import { useContent } from "../../context/ContentContext";
import { visibleDrops } from "../../utils/drops";
import { detailPath } from "../../utils/routes";

const PAGE = 3;

// /characters — the character showcase: a featured character on its
// platform, an "Explore Characters" panel to pick one (by pack), the
// visitor's own collection, the current drop banner, then every pack.
function Characters() {
  const { packs, loading, error } = usePacks();
  const { findItem } = useCatalog();
  const { drops } = useContent();
  const collection = useCollection();

  // Start on the pack of the current live drop, if any.
  const livePack = visibleDrops(drops).find((d) => d.showBanner)?.pack;
  const [packId, setPackId] = useState(null);
  const [selId, setSelId] = useState(null);
  const [page, setPage] = useState(0);

  const pack = packs.find((p) => p.id === packId) ?? packs.find((p) => p.id === livePack) ?? packs[0];
  const roster = pack?.items ?? [];
  const featured = roster.find((c) => c.id === selId) ?? roster.find((c) => !c.art.locked) ?? roster[0];
  const pages = Math.max(1, Math.ceil(roster.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = roster.slice(current * PAGE, current * PAGE + PAGE);

  const pickPack = (id) => {
    setPackId(id);
    setSelId(null);
    setPage(0);
  };

  const owned = collection.assets.map((a) => ({ asset: a, item: findItem(a.itemId) })).filter((x) => x.item);

  return (
    <div className="rd-page ch-page">
      <span className="ch-sweep" aria-hidden="true" />
      <span className="ch-rings" aria-hidden="true" />

      {error && <p className="market-error container">Couldn’t load characters. Try refreshing.</p>}

      <section className="ch-hero container" aria-busy={loading}>
        <div className="ch-copy">
          <h1 className="rd-title">
            Meet Your <span className="accent">Companions</span>
          </h1>
          <p className="ch-tag">Collect. Customize. Explore.</p>
          {featured && (
            <div className="ch-featured" key={featured.id}>
              <span className="ch-featured-meta">
                <RarityBadge rarity={featured.rarity} />
                <span>{pack.name}</span>
              </span>
              <h2>{featured.art.locked ? `${featured.name}, coming soon` : featured.name}</h2>
              {featured.description && <p>{featured.description}</p>}
              {featured.quote && <blockquote>“{featured.quote}”</blockquote>}
            </div>
          )}
          <div className="rd-actions">
            {featured && (
              <Link to={detailPath(featured, "character")} className="rd-btn is-primary" viewTransition>
                Meet {featured.name} <ArrowRight size={16} />
              </Link>
            )}
            <a href="#explore" className="rd-btn is-ghost">
              Explore Characters
            </a>
          </div>
        </div>

        <div className="ch-stage" aria-hidden={!featured}>
          <span className="rd-plat-glow" />
          <span className="rd-plat" />
          <span className="rd-plat-ring" />
          <span className="rd-plat-core" />
          {featured && (
            <div className="ch-stage-art" key={featured.id}>
              <ItemArt art={featured.art} alt={featured.title ?? featured.name} itemId={featured.id} size="lg" />
            </div>
          )}
        </div>

        <div className="ch-explore rd-glass" id="explore">
          <header className="section-title-row">
            <h2 className="section-title">Explore Characters</h2>
            <div className="ch-explore-nav">
              <button type="button" aria-label="Previous characters" onClick={() => setPage((current - 1 + pages) % pages)} disabled={pages < 2}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" aria-label="Next characters" onClick={() => setPage((current + 1) % pages)} disabled={pages < 2}>
                <ChevronRight size={18} />
              </button>
              <Link to="/marketplace?kind=characters" className="rd-link">
                View All <ArrowRight size={15} />
              </Link>
            </div>
          </header>
          <div className="ch-chips" role="tablist" aria-label="Packs">
            {packs.map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={p.id === pack?.id} onClick={() => pickPack(p.id)}>
                {p.name.replace(/ (Pack|Reimagined)$/, "")} <small>{p.items.length}</small>
              </button>
            ))}
          </div>
          <div className="ch-cards">
            {shown.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ch-card ${c.id === featured?.id ? "is-on" : ""}`}
                aria-pressed={c.id === featured?.id}
                onClick={() => setSelId(c.id)}>
                <RarityBadge rarity={c.rarity} />
                <span className="ch-card-art">
                  <ItemArt art={c.art} alt="" itemId={c.id} size="md" />
                </span>
                <span className="ch-card-foot">
                  <b>{c.name}</b>
                  <span className="ch-go" aria-hidden="true">
                    <ChevronRight size={14} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="ch-collection container">
        <div className="rd-glass ch-collection-inner">
          <header className="section-title-row">
            <h2 className="section-title">Your Collection</h2>
            {collection.connected && owned.length > 0 && (
              <Link to="/collection" className="rd-link">
                View All <ArrowRight size={15} />
              </Link>
            )}
          </header>
          {!collection.connected ? (
            <div className="ch-collection-empty">
              <p>Connect your wallet to see the characters and wearables you own.</p>
              <WalletButton />
            </div>
          ) : collection.loading ? (
            <div className="ch-mini-row" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="ch-mini skeleton-block" />
              ))}
            </div>
          ) : owned.length === 0 ? (
            <div className="ch-collection-empty">
              <p>Nothing in this wallet yet. Every character and wearable you collect shows up here.</p>
              <Link to="/marketplace" className="rd-btn is-ghost">
                Browse the Marketplace
              </Link>
            </div>
          ) : (
            <div className="ch-mini-row">
              {owned.slice(0, 8).map(({ asset, item }) => (
                <Link key={asset.address} to={`/collection/${asset.address}`} className="ch-mini">
                  <span className="ch-mini-art">
                    <ItemArt art={item.art} alt="" itemId={item.id} item={item.kind === "wearable" ? item : undefined} size="sm" />
                  </span>
                  <span className="ch-mini-foot">
                    {item.name}
                    <RarityBadge rarity={item.rarity} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container ch-banner">
        <DropBanner />
      </div>

      <section className="container ch-packs">
        <header className="section-title-row">
          <h2 className="section-title">All Packs</h2>
          <span className="rd-muted">Open a pack to meet its whole crew</span>
        </header>
        <div className="pack-grid" aria-busy={loading}>
          {packs.map((p) => (
            <PackCard key={p.id} pack={p} ownedCount={p.items.filter((c) => collection.ownsCharacter(c.id)).length} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default Characters;
