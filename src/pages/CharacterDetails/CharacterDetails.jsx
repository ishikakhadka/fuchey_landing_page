import { Link, useParams } from "react-router";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import RarityBadge from "../../components/marketplace/RarityBadge";
import PriceTag from "../../components/marketplace/PriceTag";
import PurchaseButton from "../../components/marketplace/PurchaseButton";
import AttributeList from "../../components/characters/AttributeList";
import WearableCard from "../../components/wardrobe/WearableCard";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";

import { editions } from "../../data/editions";
import { useCharacter } from "../../hooks/useCharacters";
import { useCompatibleWearables } from "../../hooks/useWearables";
import { useCollection } from "../../hooks/useCollection";
import { useListing } from "../../hooks/useListing";
import { getRarity, getWearableTypes } from "../../services/marketplace/catalog";
import { formatCount } from "../../utils/format";

function CharacterDetails() {
  const { id } = useParams();
  const { character, loading } = useCharacter(id);
  const { wearables } = useCompatibleWearables(id);
  const live = useListing(character ?? { id, listing: {} });
  const { ownsCharacter, ownsWearable, countOwned } = useCollection();

  if (loading) {
    return <div className="container market-page" aria-busy="true" />;
  }

  if (!character) {
    return (
      <div className="container market-page">
        <EmptyState
          title="This Fuchey wandered off."
          action={
            <Link to="/characters" className="ghost-button">
              <ArrowLeft size={16} /> All characters
            </Link>
          }>
          We couldn’t find a character called “{id}”.
        </EmptyState>
      </div>
    );
  }

  const { listing } = character;
  const owned = ownsCharacter(character.id);
  const slots = getWearableTypes().filter((t) => character.wardrobeSlots.includes(t.id));

  const specs = [
    ["Price", <PriceTag key="p" listing={listing} />],
    ["Edition", character.editionLabel],
    ["Rarity", getRarity(character.rarity).label],
    ["Supply", formatCount(listing.supply)],
    ["Remaining", live.remaining != null ? formatCount(live.remaining) : live.deployed ? "…" : "Not on sale yet"],
    ["Per wallet", listing.limitPerWallet ? `${listing.limitPerWallet} max` : "No limit"],
  ];

  return (
    <div className="container market-page character-details">
      <Link to="/characters" className="back-link">
        <ArrowLeft size={16} strokeWidth={2.2} /> All characters
      </Link>

      <div className="details-grid">
        <div className={`details-stage character-stage stage-${character.edition}`}>
          <span className="stage-chip">{editions[character.edition].label}</span>
          {owned && (
            <span className="stage-chip is-owned">
              <Check size={12} strokeWidth={3} /> Owned
            </span>
          )}
          <ItemArt art={character.art} alt={character.title} itemId={character.id} size="lg" />
          <span className="stage-floor" aria-hidden="true" />
        </div>

        <div className="details-info">
          <div className="details-kicker">
            <RarityBadge rarity={character.rarity} />
            <NetworkBadge />
          </div>

          <h1>{character.title}</h1>
          <p className="details-tagline">{character.tagline}</p>

          <blockquote className="details-quote">“{character.quote}”</blockquote>
          <p className="details-desc">{character.description}</p>

          <dl className="spec-grid">
            {specs.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <PurchaseButton item={character} size="lg" />

          {owned && (
            <p className="details-owned">
              You own {countOwned(character.id)} —{" "}
              <Link to="/collection" className="text-link">
                see your collection
              </Link>
            </p>
          )}

          {listing.status !== "coming-soon" && (
            <p className="details-trust">
              <ShieldCheck size={16} strokeWidth={2} />
              Minted straight to your wallet. You approve every transaction in your own wallet —
              Fuchey never sees your keys.
            </p>
          )}
        </div>
      </div>

      <div className="details-sections">
        <section>
          <h2 className="details-heading">Attributes</h2>
          <AttributeList attributes={character.attributes} />
        </section>

        <section>
          <h2 className="details-heading">Compatible wardrobe</h2>
          {slots.length ? (
            <ul className="slot-list">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <Link to={`/wardrobe?type=${slot.id}`}>
                    {slot.label}
                    <span>{wearables.filter((w) => w.type === slot.id).length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Wardrobe details arrive with the character.</p>
          )}
        </section>
      </div>

      {wearables.length > 0 && (
        <section className="details-wearables">
          <div className="row-heading">
            <h2 className="details-heading">Dress up your {character.name}</h2>
            <Link to="/wardrobe" className="text-link">
              Full wardrobe →
            </Link>
          </div>

          <div className="wearable-strip">
            {wearables.map((wearable) => (
              <WearableCard key={wearable.id} wearable={wearable} owned={ownsWearable(wearable.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default CharacterDetails;
