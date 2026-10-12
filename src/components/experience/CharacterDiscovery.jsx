import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, Eye, FastForward, Info, RefreshCw, Shuffle, Sparkles } from "lucide-react";

import ItemArt from "../marketplace/ItemArt";
import RarityBadge from "../marketplace/RarityBadge";
import PriceTag from "../marketplace/PriceTag";
import AvailabilityBadge from "../marketplace/AvailabilityBadge";
import CategoryTabs from "../marketplace/CategoryTabs";
import { useCatalog } from "../../context/CatalogContext";
import { useCollection } from "../../hooks/useCollection";
import { useReducedMotion } from "../../hooks/useMotion";
import { getPack, groupByPack } from "../../data/packs";

const OPEN_MS = 1500;

// Section B: meet the characters by unsealing them. Every character starts
// as a silhouette in a capsule; revealing one unveils its look and its real
// listing. It's a preview of the catalogue: nothing is minted, bought or sent,
// and nothing is won: the order is shuffled, but every character can be
// revealed and rarity plays no part.
//
// `revealed` (ids) lives in the home page so "Complete the Look" can dress the
// characters revealed here. `ref.reveal()` lets the hero's "Reveal a
// Character" button open a random sealed capsule.
function CharacterDiscovery({ ref, revealed, setRevealed }) {
  const { characters, loading, error, reload } = useCatalog();
  const { ownsCharacter } = useCollection();
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const packsRef = useRef(null);
  const timer = useRef(0);

  const [selectedId, setSelectedId] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  // The pack shown in the rail; null follows the character on the stage.
  const [packId, setPackId] = useState(null);
  // Which capsule is on the stage before the visitor picks one.
  const [firstPick] = useState(() => Math.random());

  useEffect(() => () => clearTimeout(timer.current), []);

  const selected =
    characters.find((c) => c.id === selectedId) ?? characters[Math.floor(firstPick * characters.length)];
  const isRevealed = (id) => revealed.includes(id);
  const stage = !selected
    ? "sealed"
    : isRevealed(selected.id)
      ? "revealed"
      : openingId === selected.id
        ? "opening"
        : "sealed";
  // A random sealed character other than `exceptId` (if there is one).
  const randomSealed = (exceptId) => {
    const sealed = characters.filter((c) => !isRevealed(c.id));
    const others = sealed.filter((c) => c.id !== exceptId);
    const pool = others.length ? others : sealed;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  };

  const finish = (id) => {
    clearTimeout(timer.current);
    setOpeningId(null);
    setRevealed((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  const open = (character) => {
    if (!character) return;
    clearTimeout(timer.current);
    setSelectedId(character.id);
    setPackId(null);
    if (isRevealed(character.id)) return;
    if (reduced) {
      finish(character.id);
      return;
    }
    setOpeningId(character.id);
    timer.current = setTimeout(() => finish(character.id), OPEN_MS);
  };

  const revealAll = () => {
    clearTimeout(timer.current);
    setOpeningId(null);
    setRevealed(characters.map((c) => c.id));
  };

  useImperativeHandle(ref, () => ({
    reveal() {
      sectionRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      const target = selected && !isRevealed(selected.id) ? selected : randomSealed(selected?.id);
      if (target) timer.current = setTimeout(() => open(target), reduced ? 0 : 600);
    },
  }));

  const sealedLeft = characters.filter((c) => !isRevealed(c.id)).length;
  const anotherSealed = characters.some((c) => !isRevealed(c.id) && c.id !== selected?.id);

  // The rail shows one pack at a time, so it stays short however big the
  // catalogue grows.
  const groups = groupByPack(characters);
  const railPack = groups.find((g) => g.id === (packId ?? getPack(selected?.pack).id)) ?? groups[0];
  // On narrow screens the pack tabs scroll sideways: keep the current one in
  // view (horizontally only, so the page itself never jumps).
  const railPackId = railPack?.id;
  useEffect(() => {
    const row = packsRef.current?.querySelector(".category-tabs");
    const tab = row?.querySelector('[aria-selected="true"]');
    if (!row || !tab) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - 16, behavior: reduced ? "auto" : "smooth" });
    }
  }, [railPackId, reduced]);

  const packTabs = groups.map((g) => ({ id: g.id, label: g.name.replace(/ (Pack|Reimagined)$/, ""), count: g.items.length }));

  return (
    <section
      className="xp-section xp-discover"
      id="discover"
      ref={sectionRef}
      aria-labelledby="xp-discover-title">
      <div className="container">
        <header className="xp-heading reveal">
          <p className="eyebrow">THE CHARACTERS</p>
          <h2 id="xp-discover-title">Something’s waiting inside.</h2>
          <p>
            Every Fuchey is its own on-chain collectible. Pick a character and open their capsule to
            unveil their look, their story and where they stand in the collection.
          </p>
        </header>

        {error && !characters.length ? (
          <div className="xp-error" role="alert">
            <p>Couldn’t load the characters right now.</p>
            <button type="button" className="ghost-button" onClick={reload}>
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : loading || !selected ? (
          <div className="xp-showcase is-skeleton" aria-busy="true">
            <div className="xp-showcase-stage skeleton-block" />
            <div className="xp-showcase-info">
              <span className="skeleton-line" style={{ width: "40%" }} />
              <span className="skeleton-line is-lg" style={{ width: "70%" }} />
              <span className="skeleton-line" />
              <span className="skeleton-line" style={{ width: "85%" }} />
            </div>
          </div>
        ) : (
          <>
            <div className={`xp-showcase is-${stage}`}>
              <div className={`xp-showcase-stage character-stage stage-${selected.edition} is-${stage}`}>
                {stage === "revealed" && ownsCharacter(selected.id) && (
                  <span className="stage-chip is-owned">
                    <Check size={12} strokeWidth={3} /> Owned
                  </span>
                )}
                <div className="xp-reveal-capsule" key={selected.id}>
                  <span className="xp-rc-glow" aria-hidden="true" />
                  <span className="xp-rc-cap" aria-hidden="true" />
                  <div className="xp-rc-inside">
                    <ItemArt
                      art={selected.art}
                      alt={stage === "revealed" ? selected.title : `${selected.name}, sealed`}
                      itemId={selected.id}
                      size="lg"
                    />
                  </div>
                  <span className="xp-rc-base" aria-hidden="true" />
                </div>
              </div>

              <div className="xp-showcase-info" key={`${selected.id}-${stage === "revealed"}`} aria-live="polite">
                <p className="xp-showcase-pack">{getPack(selected.pack).name}</p>

                {stage === "revealed" ? (
                  <>
                    <h3>{selected.art.locked ? `${selected.name}, still under wraps` : selected.name}</h3>
                    <div className="xp-showcase-badges">
                      <RarityBadge rarity={selected.rarity} />
                      <AvailabilityBadge item={selected} />
                    </div>
                    {selected.quote && <blockquote>“{selected.quote}”</blockquote>}
                    <p className="xp-showcase-lore">{selected.description}</p>

                    <div className="xp-showcase-foot">
                      <div>
                        <span className="xp-label">Price</span>
                        <PriceTag listing={selected.listing} size="lg" />
                      </div>
                      <div className="xp-showcase-actions">
                        {anotherSealed && (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => open(randomSealed(selected.id))}>
                            <Shuffle size={15} /> Reveal another
                          </button>
                        )}
                        <Link to={`/characters/${selected.id}`} className="primary-button" viewTransition>
                          Inspect {selected.name}
                          <ArrowRight size={17} strokeWidth={2.2} />
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>{selected.name}</h3>
                    <p className="xp-sealed-label">Sealed</p>
                    <p className="xp-showcase-lore">
                      {selected.name}’s look is still inside the capsule. Reveal it to see them, their
                      story and where they stand in the collection.
                    </p>
                    <div className="xp-showcase-foot">
                      {stage === "opening" ? (
                        <button type="button" className="ghost-button" onClick={() => finish(selected.id)}>
                          <FastForward size={16} /> Skip
                        </button>
                      ) : (
                        <button type="button" className="primary-button" onClick={() => open(selected)}>
                          <Sparkles size={17} strokeWidth={2} /> Reveal this character
                        </button>
                      )}
                    </div>
                  </>
                )}

                <p className="xp-note">
                  <Info size={15} strokeWidth={2} />
                  <span>
                    A preview of the collection: revealing doesn’t mint, buy or send anything to your
                    wallet. The order is random, but every character can be revealed and rarity
                    plays no part.
                  </span>
                </p>
              </div>
            </div>

            <div className="xp-rail-head">
              <span>
                {sealedLeft ? `${sealedLeft} of ${characters.length} still sealed` : "Every character revealed"}
              </span>
              {sealedLeft > 0 && (
                <button type="button" className="text-link" onClick={revealAll}>
                  <Eye size={14} /> Reveal all
                </button>
              )}
            </div>

            {groups.length > 1 && (
              <div className="xp-rail-packs" ref={packsRef}>
                <CategoryTabs label="Character pack" options={packTabs} value={railPack?.id} onChange={setPackId} />
              </div>
            )}

            <ul className="xp-rail" aria-label={railPack ? `${railPack.name} characters` : "Characters"}>
              {(railPack?.items ?? []).map((c) => {
                const shown = isRevealed(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`xp-token ${shown ? "is-revealed" : "is-sealed"} ${c.art.locked ? "is-locked" : ""}`}
                      aria-pressed={c.id === selected.id}
                      aria-label={shown ? c.name : `${c.name}, sealed`}
                      onClick={() => setSelectedId(c.id)}>
                      <span className={`xp-token-art character-stage stage-${c.edition}`}>
                        <ItemArt art={c.art} alt="" itemId={c.id} size="sm" />
                      </span>
                      <span className="xp-token-name">{c.name}</span>
                      {shown ? (
                        <AvailabilityBadge item={c} className="is-compact" />
                      ) : (
                        <span className="xp-token-sealed">Sealed</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

export default CharacterDiscovery;
