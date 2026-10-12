import { useRef, useState } from "react";

import yetiUrl from "../../assets/yeti.png";
import ScratchCard from "./ScratchCard";
import { useCatalog } from "../../context/CatalogContext";
import { useEdition } from "../../context/EditionContext";
import { useParallax, useReducedMotion } from "../../hooks/useMotion";
import { useStoredState } from "../../hooks/useStoredState";

// Picks for "Deal another card" (only called from click handlers).
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The home page opener: a scratch card with, under a frost coating, either a
// random character or the Fuchey device (the toggle above the card picks).
// Scratching a character off counts as revealing it for the rest of the page
// (`onCardReveal`). Characters still under wraps (locked art) are never
// dealt, so there's always a real look to uncover. The card on the table,
// the Character / Device choice and the device reveal are remembered in this
// browser, so coming back to the page shows the same card, still scratched.
function ExperienceHero({ revealedIds, onCardReveal }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useParallax(ref, !reduced);

  const { characters, error } = useCatalog();
  const { current } = useEdition();
  const [subject, setSubject] = useStoredState("fuchey:home:card-subject", "character");
  const [deviceRevealed, setDeviceRevealed] = useStoredState("fuchey:home:device-revealed", false);
  const deck = characters.filter((c) => !c.art.locked);
  const [firstPick] = useState(() => Math.random());
  const [cardId, setCardId] = useStoredState("fuchey:home:card", null);
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
            <a href="#waitlist" className="primary-button">
              Join the waitlist
            </a>
            <a href="#discover" className="ghost-button">
              Explore the collection
            </a>
          </div>

          <div className="xp-hero-waitlist">
            <strong>The Fuchey device is in development.</strong>
            <span>
              Join the waitlist for early access to the Companion Edition, for everyday Solana
              users, or the Dev Edition, for builders.
            </span>
          </div>
        </div>

        <div className="xp-hero-stage">
          <div className="scratch-toggle" role="group" aria-label="What’s under the frost">
            {[
              ["character", "Character"],
              ["device", "Device"],
            ].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={subject === id} onClick={() => setSubject(id)}>
                {label}
              </button>
            ))}
          </div>

          {subject === "device" ? (
            <ScratchCard
              key="device"
              kind="device"
              edition={current.id}
              revealed={deviceRevealed}
              onReveal={() => setDeviceRevealed(true)}
            />
          ) : error && !characters.length ? (
            <div className="scratch-card is-fallback">
              <div className="scratch-window character-stage stage-companion">
                <img src={yetiUrl} alt="Yeti, a Fuchey character" className="scratch-fallback-art" />
              </div>
            </div>
          ) : (
            <ScratchCard
              key={`character-${dealt}`}
              character={character}
              revealed={revealed}
              onReveal={() => {
                if (!character) return;
                setCardId(character.id);
                onCardReveal(character.id);
              }}
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
