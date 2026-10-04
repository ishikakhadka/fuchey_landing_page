import { Link } from "react-router";
import { Check } from "lucide-react";
import ItemArt from "../marketplace/ItemArt";
import RarityBadge from "../marketplace/RarityBadge";
import PriceTag from "../marketplace/PriceTag";

// Compact, art-first wearable tile. Either selectable (fitting room) via
// `onSelect`, or a link into the wardrobe.
function WearableCard({ wearable, owned = false, selected = false, onSelect }) {
  const inner = (
    <>
      <span className="wearable-tile">
        <ItemArt art={wearable.art} alt={wearable.name} itemId={wearable.id} size="sm" />
        {owned && (
          <span className="flag is-owned">
            <Check size={11} strokeWidth={3} /> Owned
          </span>
        )}
        {selected && <span className="wearing-badge">Wearing</span>}
      </span>

      <span className="wearable-meta">
        <span className="wearable-name">{wearable.name}</span>
        <span className="wearable-sub">
          <RarityBadge rarity={wearable.rarity} />
          <PriceTag listing={wearable.listing} size="sm" />
        </span>
      </span>
    </>
  );

  const className = `wearable-card rarity-edge-${wearable.rarity} ${selected ? "is-selected" : ""}`;

  if (onSelect) {
    return (
      <button type="button" className={className} aria-pressed={selected} onClick={() => onSelect(wearable)}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={`/wardrobe?item=${wearable.id}`} className={className}>
      {inner}
    </Link>
  );
}

export default WearableCard;
