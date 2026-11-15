import { useState } from "react";

import yetiUrl from "../../assets/yeti.png";
import ScratchCard from "../experience/ScratchCard";
import { useCatalog } from "../../context/CatalogContext";
import { useEdition } from "../../context/EditionContext";
import { useStoredState } from "../../hooks/useStoredState";

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The scratch card hero slide (from the original home page): a random
// character, or the Fuchey device, under a frost coating. Copy can be
// overridden per slide in the admin. Scratching a character counts as
// revealing it for the rest of the page (`onCardReveal`).
function ScratchSlide({ slide, revealedIds, onCardReveal, onInteract }) {
  const { characters, error } = useCatalog();
  const { current, setEdition } = useEdition();
  const [subject, setSubject] = useStoredState("fuchey:home:card-subject", "character");
  const [deviceRevealed, setDeviceRevealed] = useStoredState("fuchey:home:device-revealed", false);
  const deck = characters.filter((c) => !c.art.locked);
  const [firstPick] = useState(() => Math.random());
  const [cardId, setCardId] = useStoredState("fuchey:home:card", null);
  const [dealt, setDealt] = useState(0);
  const character = deck.find((c) => c.id === cardId) ?? deck[Math.floor(firstPick * deck.length)] ?? null;
  const revealed = Boolean(character && revealedIds.includes(character.id));

  const deal = () => {
    onInteract();
    const fresh = deck.filter((c) => c.id !== character?.id && !revealedIds.includes(c.id));
    const pool = fresh.length ? fresh : deck.filter((c) => c.id !== character?.id);
    if (!pool.length) return;
    setCardId(pick(pool).id);
    setDealt((n) => n + 1);
  };

  const eyebrow = slide.eyebrow || "Interactive on-chain collectibles";
  const title = slide.title || "Your next obsession is";
  const accent = slide.titleAccent || (slide.title ? "" : "on-chain.");
  const body =
    slide.body ||
    "Discover characters, collect their wearables, and bring your digital identity to life. Scratch the frost to see who’s waiting for you.";

  return (
    <div className="hm-slide hm-slide-scratch">
      <div className="hm-slide-bg" aria-hidden="true">
        <span className="hm-frost-glow" />
        <span className="tx-topo" style={{ right: "5%", top: "8%", width: 600, height: 600 }} />
        <span className="tx-grid fade-soft" style={{ left: "-8%", top: "22%", width: "52%", height: "80%" }} />
        <span className="tx-hatch fade-up" style={{ left: 0, right: 0, bottom: 0, height: 120 }} />
        <span className="sh-arc is-orange" style={{ left: "42%", top: "58%", width: 260, height: 260 }} />
        {[[49, 18, 1], [92, 30, 1.4], [53, 74, 0.8], [88, 79, 1], [39, 40, 0.7]].map(([x, y, s]) => (
          <span key={`${x}-${y}`} className="sh-flake" style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${s})` }} />
        ))}
      </div>

      <div className="hm-slide-copy">
        <span className="hm-kicker">
          <span aria-hidden="true" />
          {eyebrow}
        </span>
        <h2 className="hm-title">
          <span>{title}</span>
          {accent && <span className="accent">{accent}</span>}
        </h2>
        <p className="hm-lede">{body}</p>
        <div className="hm-actions">
          <a href={slide.ctaHref || "#waitlist"} className="hm-btn is-primary">
            {slide.ctaLabel || "Join the waitlist"}
          </a>
          <a href="#discover" className="hm-btn is-ghost">
            Explore the collection
          </a>
        </div>
        <div className="hm-note">
          <strong>The Fuchey device is in development.</strong>
          <span>
            Join the waitlist for early access to the Companion Edition, for everyday Solana users, or the Dev Edition,
            for builders.
          </span>
        </div>
      </div>

      <div className="hm-slide-stage hm-scratch-stage">
        <div className="hm-seg" role="group" aria-label="What’s under the frost">
          {[
            ["character", "Character"],
            ["device", "Device"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={subject === id}
              onClick={() => {
                onInteract();
                setSubject(id);
              }}>
              {label}
            </button>
          ))}
        </div>

        <div onPointerDown={onInteract}>
          {subject === "device" ? (
            <ScratchCard
              key="device"
              kind="device"
              edition={current.id}
              onEditionChange={setEdition}
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
        </div>
      </div>
    </div>
  );
}

export default ScratchSlide;
