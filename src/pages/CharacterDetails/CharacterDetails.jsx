import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, Shirt, X } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import CharacterRender from "../../components/characters/CharacterRender";
import RarityBadge from "../../components/marketplace/RarityBadge";
import AvailabilityBadge from "../../components/marketplace/AvailabilityBadge";
import AttributeList from "../../components/characters/AttributeList";
import WearableIcon from "../../components/wardrobe/WearableIcon";
import PriceTag from "../../components/marketplace/PriceTag";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import ListingPanel from "../../components/details/ListingPanel";
import OnChainRecord from "../../components/details/OnChainRecord";

import { editions } from "../../data/editions";
import { getPack } from "../../data/packs";
import { useCharacter } from "../../hooks/useCharacters";
import { useCompatibleWearables } from "../../hooks/useWearables";
import { useCollection } from "../../hooks/useCollection";
import { getWearableTypeLabel, getWearableTypes, isDressable } from "../../services/marketplace/catalog";
import { artTransitionName } from "../../utils/routes";

function DetailsSkeleton() {
  return (
    <div className="container market-page character-details" aria-busy="true">
      <span className="skeleton-line" style={{ width: 120 }} />
      <div className="details-grid">
        <div className="details-stage skeleton-block" />
        <div className="details-info">
          <span className="skeleton-line" style={{ width: "35%" }} />
          <span className="skeleton-line is-xl" style={{ width: "75%" }} />
          <span className="skeleton-line" />
          <span className="skeleton-line" style={{ width: "80%" }} />
          <span className="skeleton-block" style={{ height: 220, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

function CharacterDetails() {
  const { id } = useParams();
  const { character, loading, error } = useCharacter(id);
  const { wearables } = useCompatibleWearables(id);
  const { ownsCharacter, ownsWearable } = useCollection();

  // Try-on on the stage: { [slot]: wearableId }. Visual only.
  const [slots, setSlots] = useState({});

  if (loading) return <DetailsSkeleton />;

  if (!character) {
    return (
      <div className="container market-page">
        <EmptyState
          title={error ? "Couldn’t load this character." : "This Fuchey wandered off."}
          action={
            <Link to="/marketplace?kind=characters" className="ghost-button">
              <ArrowLeft size={16} /> All characters
            </Link>
          }>
          {error ? "The catalogue didn’t load. Try refreshing in a moment." : `We couldn’t find a character called “${id}”.`}
        </EmptyState>
      </div>
    );
  }

  const owned = ownsCharacter(character.id);
  const pack = getPack(character.pack);
  const dressable = isDressable(character);
  const slotTypes = getWearableTypes().filter((t) => character.wardrobeSlots.includes(t.id));
  const worn = Object.values(slots)
    .map((wid) => wearables.find((w) => w.id === wid))
    .filter(Boolean);

  const toggle = (w) =>
    setSlots((s) => {
      const next = { ...s };
      if (next[w.type] === w.id) delete next[w.type];
      else next[w.type] = w.id;
      return next;
    });

  return (
    <div className="container market-page character-details">
      <Link to="/marketplace?kind=characters" className="back-link" viewTransition>
        <ArrowLeft size={16} strokeWidth={2.2} /> Characters
      </Link>

      <div className="details-grid">
        <div className="details-visual">
          <div
            className={`details-stage character-stage stage-${character.edition}`}
            style={{ viewTransitionName: artTransitionName(character, "character") }}>
            <span className="stage-chip">{editions[character.edition]?.label ?? character.editionLabel}</span>
            {owned && (
              <span className="stage-chip is-owned">
                <Check size={12} strokeWidth={3} /> Owned
              </span>
            )}
            <div className="xp-idle">
              {dressable ? (
                <CharacterRender
                  art={character.art}
                  characterId={character.id}
                  equipped={worn}
                  alt={`${character.title}${worn.length ? ` wearing ${worn.map((w) => w.name).join(", ")}` : ""}`}
                  className="details-render"
                />
              ) : (
                <ItemArt art={character.art} alt={character.title} itemId={character.id} size="lg" />
              )}
            </div>
            <span className="stage-floor" aria-hidden="true" />
          </div>

          {worn.length > 0 && (
            <ul className="fitting-worn details-worn" aria-label="Trying on">
              {worn.map((w) => (
                <li key={w.id}>
                  <span>{w.name}</span>
                  <button type="button" aria-label={`Take off ${w.name}`} onClick={() => toggle(w)}>
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="details-info">
          <div className="details-kicker">
            <span className="details-pack">
              <Link to={`/characters/packs/${pack.id}`}>{pack.name}</Link>
            </span>
            <RarityBadge rarity={character.rarity} />
            <AvailabilityBadge item={character} />
            <NetworkBadge />
          </div>

          <h1>{character.name}</h1>
          <p className="details-tagline">{character.title}{character.tagline ? ` · ${character.tagline}` : ""}</p>

          {character.quote && <blockquote className="details-quote">“{character.quote}”</blockquote>}
          <p className="details-desc">{character.description}</p>

          <ListingPanel item={character} />
        </div>
      </div>

      {dressable && wearables.length > 0 && (
        <section className="details-wearables">
          <div className="row-heading">
            <div>
              <h2 className="details-heading">Compatible wearables</h2>
              <p className="muted">Tap a piece to try it on {character.name} above. It’s a preview, nothing is equipped on-chain.</p>
            </div>
            <Link to={`/wardrobe?character=${character.id}`} className="ghost-button">
              <Shirt size={16} /> Fitting room
            </Link>
          </div>

          <ul className="tryon-strip">
            {wearables.map((w) => {
              const on = slots[w.type] === w.id;
              return (
                <li key={w.id}>
                  <button type="button" className={`xp-piece ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => toggle(w)}>
                    <span className="xp-piece-art">
                      <WearableIcon id={w.id} />
                      {on && (
                        <span className="xp-piece-check" aria-hidden="true">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="xp-piece-body">
                      <span className="xp-piece-type">{getWearableTypeLabel(w.type)}</span>
                      <span className="xp-piece-name">{w.name}</span>
                      <span className="xp-piece-row">
                        <PriceTag listing={w.listing} size="sm" />
                        {ownsWearable(w.id) && <span className="flag is-owned">Owned</span>}
                      </span>
                    </span>
                  </button>
                  <Link to={`/wearables/${w.id}`} className="tryon-more" viewTransition aria-label={`${w.name} details`}>
                    <ArrowRight size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="details-sections">
        <section>
          <h2 className="details-heading">Attributes</h2>
          {character.attributes.length ? (
            <AttributeList attributes={character.attributes} />
          ) : (
            <p className="muted">Attributes arrive with the character.</p>
          )}
          {slotTypes.length > 0 && (
            <>
              <h3 className="onchain-sub">Wardrobe slots</h3>
              <ul className="slot-list">
                {slotTypes.map((slot) => (
                  <li key={slot.id}>
                    <Link to={`/wardrobe?character=${character.id}&type=${slot.id}`}>
                      {slot.label}
                      <span>{wearables.filter((w) => w.type === slot.id).length}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <OnChainRecord item={character} />
      </div>
    </div>
  );
}

export default CharacterDetails;
