import { Link } from "react-router";

import yetiUrl from "../../assets/yeti.png";
import ItemArt from "../marketplace/ItemArt";
import PriceTag from "../marketplace/PriceTag";
import RarityBadge from "../marketplace/RarityBadge";
import { useCatalog } from "../../context/CatalogContext";
import { useContent } from "../../context/ContentContext";
import { useNow } from "../../hooks/useNow";
import { getPack, groupByPack } from "../../data/packs";
import { backdropFor, dropTiming, visibleDrops } from "../../utils/drops";
import { detailPath } from "../../utils/routes";

const onSale = (item) => item.sale?.status === "active";

// The universe in numbers: straight from the published catalogue.
export function StatsStrip() {
  const { characters, wearables, loading } = useCatalog();
  if (loading) return null;
  const packs = groupByPack(characters).length;
  const live = [...characters, ...wearables].filter(onSale).length;
  return (
    <section className="hm-stats" aria-label="Fuchey in numbers">
      <span className="tx-dots" aria-hidden="true" style={{ right: 0, top: -10, width: 240, height: 90 }} />
      <div className="hm-stat-row">
        <div className="hm-stat"><b>{characters.length}</b><span>Characters</span></div>
        <div className="hm-stat"><b>{wearables.length}</b><span>Wearables</span></div>
        <div className="hm-stat"><b>{packs}</b><span>Packs</span></div>
        <div className="hm-stat"><b className="accent">{live}</b><span>On sale now</span></div>
      </div>
      <span className="hm-stat-note">Every piece lives in your Solana wallet</span>
    </section>
  );
}

// Characters marching slowly past. The admin picks who's in it and how fast
// (Admin → Home → Character parade); no picks means every revealed character.
export function CastParade() {
  const { characters } = useCatalog();
  const { settings } = useContent();
  const picked = settings.parade?.characterIds ?? [];
  const revealed = characters.filter((c) => !c.art.locked);
  const cast = picked.length ? picked.map((id) => revealed.find((c) => c.id === id)).filter(Boolean) : revealed;
  if (!cast.length) return null;
  // Repeat short lists so the loop always fills the screen.
  const loop = Array.from({ length: Math.max(1, Math.ceil(12 / cast.length)) }, () => cast).flat();
  return (
    <section className="hm-parade" aria-label="The Fuchey characters">
      <span className="tx-dots" aria-hidden="true" style={{ inset: 0 }} />
      <div className="hm-parade-track" style={{ animationDuration: `${settings.parade?.seconds ?? 60}s` }}>
        {[...loop, ...loop].map((c, i) => (
          <Link key={`${c.id}-${i}`} to={detailPath(c, "character")} className="hm-parade-item" tabIndex={i < cast.length ? 0 : -1} aria-hidden={i >= cast.length}>
            <ItemArt art={c.art} alt="" itemId={c.id} size="sm" />
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  ["01", "Collect", "Mint a companion", "Pick a character from any pack. Each one is an NFT that lives in your own wallet."],
  ["02", "Customize", "Dress them up", "Hats, outfits and held items layer onto your character. Save the look to your wallet."],
  ["03", "Connect", "Bring them home", "The Fuchey Companion puts your character on your desk, reacting to your wallet in real time."],
];

export function HowItWorks() {
  const { wearables } = useCatalog();
  const props = wearables.filter((w) => getPack(w.pack).id === "wild").slice(0, 3);
  return (
    <section className="hm-section hm-how">
      <span className="tx-grid fade-soft" aria-hidden="true" style={{ left: "14%", top: 40, width: "72%", height: 520 }} />
      <header className="hm-head">
        <h2 className="hm-st">How Fuchey Works</h2>
        <span>Three steps from wallet to companion</span>
      </header>
      <div className="hm-steps">
        {STEPS.map(([n, kicker, title, copy], i) => (
          <article key={n} className={`hm-step ${i === 2 ? "is-accent" : ""}`}>
            <span className="hm-ghostnum" aria-hidden="true">{n}</span>
            <div className="hm-step-art">
              {i === 0 && <img src={yetiUrl} alt="" />}
              {i === 1 && props.map((w) => <ItemArt key={w.id} art={w.art} alt="" itemId={w.id} item={w} size="sm" />)}
              {i === 2 && <img src="/fuchey-mark.png" alt="" className="is-mark" />}
            </div>
            <span className="hm-step-n">
              {n} · {kicker.toUpperCase()}
            </span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// Live drops set to show here in the admin, in their order; each with its
// scene, lead character and timing. Hidden when there are none.
export function UpcomingDrops() {
  const { drops } = useContent();
  const { characters } = useCatalog();
  const now = useNow();
  const list = visibleDrops(drops, now).filter((d) => d.showInUpcoming);
  if (!list.length) return null;
  return (
    <section className="hm-section hm-drops">
      <span className="tx-scan fade-x" aria-hidden="true" style={{ left: 0, right: 0, top: 150, height: 300 }} />
      <header className="hm-head">
        <h2 className="hm-st">Upcoming Drops</h2>
        <Link to="/marketplace">All packs →</Link>
      </header>
      <div className="hm-drop-row">
        {list.map((d, i) => {
          const lead = characters.find((c) => c.id === d.characterIds[Math.floor((d.characterIds.length - 1) / 2)]);
          const timing = dropTiming(d, now);
          const to = d.ctaHref?.startsWith("/") ? d.ctaHref : `/characters/packs/${getPack(d.pack).id}`;
          return (
            <Link key={d.id} to={to} className={`hm-drop ${i === 0 ? "is-next" : ""}`}>
              <img className="hm-drop-bg" src={backdropFor(d)} alt="" />
              <span className="hm-drop-fade" />
              {lead && (
                <span className="hm-drop-art">
                  <ItemArt art={lead.art} alt="" itemId={lead.id} size="md" />
                </span>
              )}
              <span className="hm-drop-meta">
                <b>{getPack(d.pack).name}</b>
                <span className={timing.target ? "is-live" : ""}>{timing.text}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Whatever is genuinely on sale on this network right now (verified sales).
export function OnSaleNow() {
  const { characters, wearables } = useCatalog();
  const hero = characters.find((c) => onSale(c) && !c.art.locked);
  const items = wearables.filter(onSale).slice(0, 3);
  if (!hero && !items.length) return null;
  return (
    <section className="hm-section hm-sale">
      <span className="tx-dots fade-soft" aria-hidden="true" style={{ left: 40, top: -20, width: 640, height: 520 }} />
      {[[90, 60, 1], [520, 40, 1.3], [600, 330, 0.8], [60, 360, 1.1]].map(([x, y, s]) => (
        <span key={`${x}-${y}`} className="sh-flake" aria-hidden="true" style={{ left: x, top: y, transform: `scale(${s})` }} />
      ))}
      {hero && (
        <div className="hm-sale-stage">
          <span className="hm-plat-ring" aria-hidden="true" />
          <ItemArt art={hero.art} alt={hero.title ?? hero.name} itemId={hero.id} size="lg" />
        </div>
      )}
      <div className="hm-sale-copy">
        <span className="hm-chip is-good">On sale now{hero ? ` · ${getPack(hero.pack).name}` : ""}</span>
        <h2 className="hm-h2">
          {hero ? (
            <>
              Start with the <span className="accent">{hero.name}</span>
            </>
          ) : (
            "Fresh in the marketplace"
          )}
        </h2>
        {hero?.description && <p className="hm-lede">{hero.description}</p>}
        {items.length > 0 && (
          <div className="hm-sale-items">
            {items.map((w) => (
              <Link key={w.id} to={detailPath(w, "wearable")} className="hm-sale-item">
                <ItemArt art={w.art} alt="" itemId={w.id} item={w} size="sm" />
                <span>
                  <b>{w.name}</b>
                  <RarityBadge rarity={w.rarity} />
                  <PriceTag listing={w.listing} size="sm" />
                </span>
              </Link>
            ))}
          </div>
        )}
        <div className="hm-actions">
          {hero && (
            <Link to={detailPath(hero, "character")} className="hm-btn is-primary">
              {hero.listing.price === 0 ? `Claim ${hero.name} · Free` : `Get ${hero.name}`}
            </Link>
          )}
          <Link to="/marketplace" className="hm-btn is-ghost">
            Browse the Marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}
