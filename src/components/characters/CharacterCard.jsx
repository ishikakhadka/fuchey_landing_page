import { Link } from "react-router";
import { Check } from "lucide-react";
import ItemArt from "../marketplace/ItemArt";
import RarityBadge from "../marketplace/RarityBadge";
import PriceTag from "../marketplace/PriceTag";
import SupplyMeter from "../marketplace/SupplyMeter";
import PurchaseButton from "../marketplace/PurchaseButton";
import { editions } from "../../data/editions";

function CharacterCard({ character, owned = false }) {
  const soon = character.listing.status === "coming-soon";
  const edition = editions[character.edition];

  return (
    <article className={`character-card ${soon ? "is-soon" : ""}`}>
      <div className={`character-stage stage-${character.edition}`}>
        <span className="stage-chip">{edition.shortLabel}</span>
        {owned && (
          <span className="stage-chip is-owned">
            <Check size={12} strokeWidth={3} /> Owned
          </span>
        )}
        <ItemArt art={character.art} alt={character.title} itemId={character.id} size="md" />
        <span className="stage-floor" aria-hidden="true" />
      </div>

      <div className="character-card-body">
        <div className="character-card-title">
          <h3>
            <Link to={`/characters/${character.id}`} className="card-link">
              {character.name}
            </Link>
          </h3>
          <RarityBadge rarity={character.rarity} />
        </div>

        <p className="character-card-tagline">{character.tagline}</p>

        <dl className="character-card-meta">
          <div>
            <dt>Price</dt>
            <dd>
              <PriceTag listing={character.listing} />
            </dd>
          </div>
          <div>
            <dt>Edition</dt>
            <dd>{character.editionLabel}</dd>
          </div>
        </dl>

        <SupplyMeter item={character} />

        <PurchaseButton item={character} />
      </div>
    </article>
  );
}

export default CharacterCard;
