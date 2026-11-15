import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import ItemArt from "./ItemArt";
import RarityBadge from "./RarityBadge";
import { useCatalog } from "../../context/CatalogContext";
import { useMarketplace } from "../../context/MarketplaceContext";
import { liveListing } from "../../hooks/useListing";
import { getAvailability } from "../../utils/listing";
import { getRarity } from "../../services/marketplace/catalog";
import { groupByPack, packBackdrop } from "../../data/packs";
import { usePriceFormat } from "../../hooks/usePrice";

// "Explore Character Packs": one pack at a time, large, with its neighbours
// peeking in at the sides. Arrows, dots, ← → keys and swipe all move it.
// Everything shown comes from the catalogue (characters, counts, rarity,
// what's actually on sale and from what price).
function PackCarousel({ autoplay = false, seconds = 6 }) {
  const { characters, wearables, loading } = useCatalog();
  const market = useMarketplace();
  const packs = groupByPack(characters);
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const formatPrice = usePriceFormat();
  const paused = useRef(false);
  const count = packs.length;

  // Moves on its own; hovering, focusing or touching it holds it still.
  useEffect(() => {
    if (!autoplay || count < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [autoplay, count, seconds]);

  if (loading || !packs.length) return null;
  const n = packs.length;
  const at = (i) => packs[((i % n) + n) % n];
  const go = (i) => setIndex(((i % n) + n) % n);

  const describe = (pack) => {
    const items = [...pack.items, ...wearables.filter((w) => w.pack === pack.id)];
    const onSale = items.filter((i) => getAvailability(i, liveListing(market, i)).id === "on-sale");
    // Cheapest by what the sale charges in SOL, shown in its own currency.
    const cheapest = onSale.filter((i) => i.listing.price != null).sort((a, b) => (a.listing.solPrice ?? a.listing.price) - (b.listing.solPrice ?? b.listing.price))[0];
    const top = pack.items.reduce((best, c) => (getRarity(c.rarity).rank > getRarity(best).rank ? c.rarity : best), "common");
    return {
      wearableCount: items.length - pack.items.length,
      status: onSale.length ? `${onSale.length} on sale` : "Coming soon",
      live: onSale.length > 0,
      price: cheapest ? (cheapest.listing.price === 0 ? "From free" : `From ${formatPrice(cheapest.listing)}`) : "Prices at launch",
      top,
    };
  };

  const card = (pack, role) => {
    const info = describe(pack);
    const lineup = pack.items.filter((c) => !c.art.locked).slice(0, 3);
    return (
      <article key={`${role}-${pack.id}`} className={`pack-slide is-${role}`} aria-hidden={role !== "main"}>
        <img className="pack-slide-bg" src={packBackdrop(pack)} alt="" />
        <span className="pack-slide-shade" />
        {role === "main" && (
          <span className="pack-slide-tags">
            <span className={`pack-slide-status ${info.live ? "is-live" : ""}`}>{info.status}</span>
            <span className="pack-slide-top">
              Up to <RarityBadge rarity={info.top} />
            </span>
          </span>
        )}
        <span className="pack-slide-ring" aria-hidden="true" />
        <span className={`pack-slide-line count-${lineup.length}`}>
          {lineup.map((c) => (
            <ItemArt key={c.id} art={c.art} alt={role === "main" ? c.name : ""} itemId={c.id} size="md" />
          ))}
        </span>
        <span className="pack-slide-meta">
          <span>
            <b>{pack.name}</b>
            {role === "main" && <span className="pack-slide-tagline">{pack.tagline}</span>}
            {role === "main" && (
              <small>
                {pack.items.length} characters · {info.wearableCount} wearables · {info.price}
              </small>
            )}
          </span>
          {role === "main" && (
            <Link to={`/characters/packs/${pack.id}`} className="pack-slide-cta" tabIndex={0}>
              Open Pack
            </Link>
          )}
        </span>
      </article>
    );
  };

  return (
    <section
      className="pack-carousel"
      aria-roledescription="carousel"
      aria-label="Character packs"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      onPointerDown={(e) => (touch.current = e.clientX)}
      onPointerUp={(e) => {
        if (touch.current == null) return;
        const dx = e.clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}>
      <header className="section-title-row">
        <h2 className="section-title">Explore Character Packs</h2>
        <span className="pack-carousel-pos" aria-live="polite">
          {index + 1} / {n}
        </span>
      </header>
      <div className="pack-carousel-track">
        {n > 2 && card(at(index - 1), "side")}
        {card(at(index), "main")}
        {n > 1 && card(at(index + 1), "side")}
        {n > 1 && (
          <>
            <button type="button" className="pack-carousel-arrow is-prev" aria-label="Previous pack" onClick={() => go(index - 1)}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="pack-carousel-arrow is-next" aria-label="Next pack" onClick={() => go(index + 1)}>
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      <div className="pack-carousel-dots">
        {packs.map((p, i) => (
          <button key={p.id} type="button" className={i === index ? "is-on" : ""} aria-label={`Go to ${p.name}`} aria-current={i === index} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  );
}

export default PackCarousel;
