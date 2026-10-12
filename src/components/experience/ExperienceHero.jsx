import { useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import yetiUrl from "../../assets/yeti.png";
import NetworkBadge from "../wallet/NetworkBadge";
import ScratchCard from "./ScratchCard";
import { useCatalog } from "../../context/CatalogContext";
import { useParallax, useReducedMotion } from "../../hooks/useMotion";

// Picks for "Deal another card" (only called from click handlers).
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The home page opener: a scratch card dealt with a random character under a
// frost coating. Scratching it off counts as revealing that character for the
// rest of the page (`onCardReveal`). Characters still under wraps (locked
// art) are never dealt, so there's always a real look to uncover.
function ExperienceHero({ onReveal, revealedIds, onCardReveal }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useParallax(ref, !reduced);

  const { characters, error } = useCatalog();
  const deck = characters.filter((c) => !c.art.locked);
  const [firstPick] = useState(() => Math.random());
  const [cardId, setCardId] = useState(null);
  const [dealt, setDealt] = useState(0);
  const character = deck.find((c) => c.id === cardId) ?? deck[Math.floor(firstPick * deck.length)] ?? null;
  const revealed = Boolean(character && revealedIds.includes(character.id));

  const deal = () => {
    const fresh = deck.filter((c) => c.id !== character?.id && !revealedIds.includes(c.id));
    const pool = fresh.length ? fresh : deck.filter((c) => c.id !== character?.id);
    if (!pool.length) return;
    setCardId(pick(pool).id);
    setDealt((n) => n + 1);
  };

  return (
    <section className="xp-hero" ref={ref} aria-labelledby="xp-hero-title">
      <div className="xp-hero-atmos" aria-hidden="true">
        <span className="xp-beam" />
        <span className="xp-fog xp-fog-1" />
        <span className="xp-fog xp-fog-2" />
      </div>

      <div className="container xp-hero-grid">
        <div className="xp-hero-copy">
          <p className="xp-kicker">
            <span className="xp-kicker-line" aria-hidden="true" />
            Interactive on-chain collectibles
          </p>

          <h1 id="xp-hero-title">
            Your next obsession is <span className="accent">on-chain.</span>
          </h1>

          <p className="xp-lede">
            Discover characters, collect their wearables, and bring your digital identity to life.
          </p>

          <div className="hero-actions">
            <Link to="/marketplace" className="primary-button" viewTransition>
              Explore the Collection
              <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
            <button type="button" className="ghost-button" onClick={onReveal}>
              <Sparkles size={16} strokeWidth={2} />
              Reveal a Character
            </button>
          </div>

          <div className="xp-hero-meta">
            <NetworkBadge />
            <span>Characters and wearables you hold in your own wallet.</span>
          </div>
        </div>

        <div className="xp-hero-stage">
          {error && !characters.length ? (
            <div className="scratch-card is-fallback">
              <div className="scratch-window character-stage stage-companion">
                <img src={yetiUrl} alt="Yeti, a Fuchey character" className="scratch-fallback-art" />
              </div>
            </div>
          ) : (
            <ScratchCard
              key={dealt}
              character={character}
              revealed={revealed}
              onReveal={() => character && onCardReveal(character.id)}
              onDeal={deal}
            />
          )}
          <span className="xp-pedestal" aria-hidden="true" />
        </div>
      </div>

      <a href="#discover" className="xp-scroll-cue">
        <span aria-hidden="true" />
        Discover
      </a>
    </section>
  );
}

export default ExperienceHero;
