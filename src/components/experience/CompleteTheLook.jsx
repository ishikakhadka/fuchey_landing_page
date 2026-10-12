import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Info, RotateCcw, Shuffle, Sparkles } from "lucide-react";

import CharacterRender from "../characters/CharacterRender";
import WearableIcon from "../wardrobe/WearableIcon";
import AvailabilityBadge from "../marketplace/AvailabilityBadge";
import { useCatalog } from "../../context/CatalogContext";
import { fitsCharacter, getWearableTypeLabel, isDressable } from "../../services/marketplace/catalog";
import { WEARABLE_TYPES } from "../../data/taxonomy";
import { formatSol } from "../../utils/format";

// Where each slot's control sits around the character: things worn up top on
// the left, the body and hands on the right.
const LEFT = ["hat", "headwear", "accessory", "special"];
const RIGHT = ["outfit", "backpack", "held"];

// Random helpers for Shuffle (only ever called from click handlers).
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const coin = (odds) => Math.random() < odds;

// One wardrobe slot: arrows cycle through every piece that fits (and "none").
function SlotControl({ type, pieces, current, onStep, side }) {
  const label = getWearableTypeLabel(type);
  const index = current ? pieces.findIndex((w) => w.id === current.id) + 1 : 0;

  return (
    <div className={`look-slot is-${side} ${current ? "is-filled" : ""}`}>
      <span className="look-slot-label">{label}</span>
      <div className="look-slot-row">
        <button type="button" className="look-step" aria-label={`Previous ${label.toLowerCase()}`} onClick={() => onStep(-1)}>
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="look-slot-icon"
          aria-label={`Next ${label.toLowerCase()}${current ? `, wearing ${current.name}` : ""}`}
          onClick={() => onStep(1)}>
          {current ? (
            <WearableIcon id={current.id} key={current.id} />
          ) : (
            <span className="look-slot-empty" aria-hidden="true">+</span>
          )}
        </button>
        <button type="button" className="look-step" aria-label={`Next ${label.toLowerCase()}`} onClick={() => onStep(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <span className="look-slot-name">{current ? current.name : "None"}</span>
      <span className="look-slot-meta">
        {current
          ? current.listing.price == null
            ? "Price TBA"
            : formatSol(current.listing.price)
          : `${pieces.length} to try`}
        <span className="look-slot-count">
          {index}/{pieces.length}
        </span>
      </span>
    </div>
  );
}

// Section D: a dressing room. The character stands centre stage with a
// control for every wardrobe slot around them; arrows cycle the pieces that
// fit, Shuffle throws a random outfit together, and the finished look can be
// taken into the fitting room. Only characters revealed above (scratch card
// or capsules) can be dressed, so the sections play together.
//
// Same layered renderer as the fitting room. Purely a preview: nothing is
// equipped on-chain and nothing is bought from here.
function CompleteTheLook({ unlocked, onRevealMore }) {
  const { characters, wearables, loading } = useCatalog();

  const dressable = characters.filter(isDressable);
  const available = dressable.filter((c) => unlocked.includes(c.id));
  const stillSealed = dressable.length - available.length;

  const [characterId, setCharacterId] = useState(null);
  const character = available.find((c) => c.id === characterId) ?? available[0];

  // { [characterId]: { [slot]: wearableId } }, like the fitting room, plus
  // the last piece put on (for the "equipped" chip and the hop).
  const [looks, setLooks] = useState({});
  const [lastOn, setLastOn] = useState(null);
  const slots = (character && looks[character.id]) ?? {};

  const rack = character ? wearables.filter((w) => fitsCharacter(w, character.id)) : [];
  const types = WEARABLE_TYPES.map((t) => t.id).filter((id) => rack.some((w) => w.type === id));
  const piecesFor = (type) => rack.filter((w) => w.type === type);
  const currentIn = (type) => rack.find((w) => w.id === slots[type]) ?? null;
  const worn = types.map(currentIn).filter(Boolean);

  const setSlots = (next, changed) => {
    setLooks((all) => ({ ...all, [character.id]: next }));
    setLastOn((last) => (changed ? { id: changed.id, name: changed.name, at: (last?.at ?? 0) + 1 } : null));
  };

  const step = (type, dir) => {
    const pieces = piecesFor(type);
    const options = [null, ...pieces];
    const at = options.findIndex((w) => (w?.id ?? null) === (slots[type] ?? null));
    const next = options[(at + dir + options.length) % options.length];
    const updated = { ...slots };
    if (next) updated[type] = next.id;
    else delete updated[type];
    setSlots(updated, next);
  };

  // A random outfit: each slot gets a piece about two times in three.
  const shuffle = () => {
    const updated = {};
    types.forEach((type) => {
      const pieces = piecesFor(type);
      if (coin(0.66)) updated[type] = pick(pieces).id;
    });
    if (!Object.keys(updated).length && types.length) {
      const type = pick(types);
      updated[type] = piecesFor(type)[0].id;
    }
    setSlots(updated, { id: "shuffle", name: "New look" });
  };

  const switchCharacter = (dir) => {
    const at = available.findIndex((c) => c.id === character.id);
    setCharacterId(available[(at + dir + available.length) % available.length].id);
    setLastOn(null);
  };

  const priced = worn.filter((w) => w.listing.price != null);
  const total = priced.reduce((sum, w) => sum + w.listing.price, 0);
  const unpriced = worn.length - priced.length;
  const lookLink = character
    ? `/wardrobe/packs/${character.pack ?? "wild"}?character=${character.id}${worn.length ? `&look=${worn.map((w) => w.id).join(",")}` : ""}`
    : "/wardrobe";

  const side = (list, where) =>
    list
      .filter((type) => types.includes(type))
      .map((type) => (
        <SlotControl
          key={type}
          type={type}
          side={where}
          pieces={piecesFor(type)}
          current={currentIn(type)}
          onStep={(dir) => step(type, dir)}
        />
      ));

  if (!loading && !dressable.length) return null;

  return (
    <section className="xp-section xp-look" id="look" aria-labelledby="xp-look-title">
      <div className="container">
        <header className="xp-heading reveal">
          <p className="eyebrow">WEARABLES</p>
          <h2 id="xp-look-title">Complete the Look.</h2>
          <p>Discover the pieces that make each character yours.</p>
        </header>

        {loading ? (
          <div className="look-room skeleton-block" aria-busy="true" style={{ minHeight: 520 }} />
        ) : !character ? (
          <div className="look-room is-empty">
            <p>Reveal a character above, then come back to dress them.</p>
            <button type="button" className="primary-button" onClick={onRevealMore}>
              <Sparkles size={16} /> Reveal a Character
            </button>
          </div>
        ) : (
          <div className="look-room">
            <div className="look-slots is-left">{side(LEFT, "left")}</div>

            <div className={`look-stage character-stage stage-${character.edition}`}>
              <div className="look-who">
                {available.length > 1 && (
                  <button type="button" className="look-step" aria-label="Previous character" onClick={() => switchCharacter(-1)}>
                    <ChevronLeft size={18} />
                  </button>
                )}
                <span className="look-who-name" aria-live="polite">
                  {character.name}
                </span>
                {available.length > 1 && (
                  <button type="button" className="look-step" aria-label="Next character" onClick={() => switchCharacter(1)}>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              <div className="look-figure" key={`${character.id}-${lastOn?.at ?? 0}`}>
                <CharacterRender
                  art={character.art}
                  characterId={character.id}
                  equipped={worn}
                  alt={`${character.name} wearing ${worn.map((w) => w.name).join(", ") || "nothing extra"}`}
                  className="look-render"
                />
              </div>
              <span className="stage-floor" aria-hidden="true" />

              {lastOn && (
                <span className="look-chip" key={lastOn.at} aria-hidden="true">
                  {lastOn.id === "shuffle" ? "Shuffled" : `+ ${lastOn.name}`}
                </span>
              )}

              <div className="look-stage-actions">
                <button type="button" className="look-action" onClick={shuffle}>
                  <Shuffle size={15} /> Shuffle
                </button>
                <button
                  type="button"
                  className="look-action"
                  onClick={() => setSlots({}, null)}
                  disabled={!worn.length}>
                  <RotateCcw size={15} /> Clear
                </button>
              </div>
            </div>

            <div className="look-slots is-right">{side(RIGHT, "right")}</div>

            <div className="look-summary">
              <div className="look-summary-pieces">
                <span className="xp-label">This look</span>
                {worn.length ? (
                  <ul>
                    {worn.map((w) => (
                      <li key={w.id}>
                        <Link to={`/wearables/${w.id}`} viewTransition>
                          {w.name}
                        </Link>
                        <AvailabilityBadge item={w} className="is-compact" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Nothing on yet. Use the arrows or hit Shuffle.</p>
                )}
              </div>

              <div className="look-summary-total">
                <span className="xp-label">Total</span>
                <strong>{worn.length ? formatSol(total) : "—"}</strong>
                {unpriced > 0 && <span className="muted">+ {unpriced} price TBA</span>}
              </div>

              <Link to={lookLink} className="primary-button">
                Take this look to the fitting room
                <ArrowRight size={17} strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        )}

        <div className="look-foot">
          <p className="xp-note">
            <Info size={15} strokeWidth={2} />
            <span>
              A try-on preview with the same artwork the wardrobe uses. Nothing is equipped or bought
              until you choose to.
            </span>
          </p>
          {stillSealed > 0 && character && (
            <button type="button" className="text-link" onClick={onRevealMore}>
              <Sparkles size={14} /> {stillSealed} more {stillSealed === 1 ? "character" : "characters"} to
              reveal and dress
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default CompleteTheLook;
