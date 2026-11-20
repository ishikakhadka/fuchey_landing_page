import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import RarityBadge from "../../components/marketplace/RarityBadge";
import DropBanner from "../../components/drops/DropBanner";
import WalletButton from "../../components/wallet/WalletButton";
import { usePacks } from "../../hooks/useCharacters";
import { useCollection } from "../../hooks/useCollection";
import { useCatalog } from "../../context/CatalogContext";
import { useContent } from "../../context/ContentContext";
import { visibleDrops } from "../../utils/drops";
import { usePackScene } from "../../hooks/usePackScene";
import { detailPath } from "../../utils/routes";

const AUTOPLAY_MS = 5000;

// /characters — pick a pack, and its characters rotate on the stage one at a
// time. Which characters (and in what order) each pack shows, and which pack
// opens first, come from Admin → Home → Characters page; with no picks the
// whole pack shows. The pack's scene sits behind the stage and changes with
// it. Then the visitor's collection and the drop banner.
function Characters() {
  const { packs, loading, error } = usePacks();
  const { findItem } = useCatalog();
  const { drops, settings } = useContent();
  const sceneOf = usePackScene();
  const collection = useCollection();

  const showcase = settings.showcase ?? { defaultPack: "", packs: {} };
  const livePack = visibleDrops(drops).find((d) => d.showBanner)?.pack;
  const [packId, setPackId] = useState(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const pack =
    packs.find((p) => p.id === packId) ??
    packs.find((p) => p.id === showcase.defaultPack) ??
    packs.find((p) => p.id === livePack) ??
    packs[0];
  const picked = (pack && showcase.packs[pack.id]) || [];
  const roster = picked.length ? picked.map((id) => pack.items.find((c) => c.id === id)).filter(Boolean) : (pack?.items ?? []);
  const n = roster.length;
  const current = n ? ((index % n) + n) % n : 0;
  const featured = n ? roster[current] : null;

  // Rotate through the pack; hovering or focusing the stage holds it.
  useEffect(() => {
    if (n < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!paused.current) setIndex((i) => i + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [n, pack?.id]);

  const pickPack = (id) => {
    setPackId(id);
    setIndex(0);
  };

  const owned = collection.assets.map((a) => ({ asset: a, item: findItem(a.itemId) })).filter((x) => x.item);

  return (
    <div className="rd-page ch-page">
      {pack && (
        <div className="ch-backdrop" key={pack.id} aria-hidden="true">
          <img src={sceneOf(pack)} alt="" />
        </div>
      )}

      {error && <p className="market-error container">Couldn’t load characters. Try refreshing.</p>}

      <section className="ch-hero container" aria-busy={loading}>
        <div className="ch-copy">
          <h1 className="rd-title">
            Meet Your <span className="accent">Companions</span>
          </h1>
          <p className="ch-tag">Collect. Customize. Explore.</p>

          <div className="ch-chips" role="tablist" aria-label="Packs">
            {packs.map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={p.id === pack?.id} onClick={() => pickPack(p.id)}>
                {p.name.replace(/ (Pack|Reimagined)$/, "")}
              </button>
            ))}
          </div>

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
            {pack && (
              <Link to={`/characters/packs/${pack.id}`} className="rd-btn is-ghost">
                Open {pack.name}
              </Link>
            )}
          </div>
        </div>

        <div
          className="ch-carousel"
          aria-roledescription="carousel"
          aria-label={pack ? `${pack.name} characters` : "Characters"}
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
          onFocus={() => (paused.current = true)}
          onBlur={() => (paused.current = false)}>
          <div className="ch-stage">
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

          {n > 1 && (
            <div className="ch-carousel-nav">
              <button type="button" className="ch-arrow" aria-label="Previous character" onClick={() => setIndex(current - 1)}>
                <ChevronLeft size={20} />
              </button>
              <div className="ch-thumbs">
                {roster.map((c, i) => (
                  <button key={c.id} type="button" className={i === current ? "is-on" : ""} aria-label={c.name} aria-current={i === current} onClick={() => setIndex(i)}>
                    <ItemArt art={c.art} alt="" itemId={c.id} size="sm" />
                  </button>
                ))}
              </div>
              <button type="button" className="ch-arrow" aria-label="Next character" onClick={() => setIndex(current + 1)}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="ch-collection container">
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
      </section>

      <div className="container ch-banner">
        <DropBanner />
      </div>

    </div>
  );
}

export default Characters;
