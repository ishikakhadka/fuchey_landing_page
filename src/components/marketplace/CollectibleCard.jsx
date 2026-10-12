import { Link } from "react-router";
import { Check } from "lucide-react";

import ItemArt from "./ItemArt";
import RarityBadge from "./RarityBadge";
import PriceTag from "./PriceTag";
import AvailabilityBadge from "./AvailabilityBadge";
import { getPack } from "../../data/packs";
import { getWearableTypeLabel } from "../../services/marketplace/catalog";
import { artTransitionName, detailPath } from "../../utils/routes";

// One collectible in the marketplace browser: characters and wearables share
// the card; `kind` says which.
function CollectibleCard({ item, kind, owned = false }) {
  const typeLabel = kind === "character" ? "Character" : getWearableTypeLabel(item.type);

  return (
    <Link
      to={detailPath(item, kind)}
      viewTransition
      className={`collectible-card kind-${kind} ${item.art.locked ? "is-locked" : ""}`}>
      <span
        className={`collectible-art character-stage stage-${item.edition ?? "companion"}`}
        style={{ viewTransitionName: artTransitionName(item, kind) }}>
        {owned && (
          <span className="stage-chip is-owned">
            <Check size={12} strokeWidth={3} /> Owned
          </span>
        )}
        <span className="collectible-art-inner">
          <ItemArt art={item.art} alt="" itemId={item.id} item={kind === "wearable" ? item : undefined} size="md" />
        </span>
        <span className="stage-floor" aria-hidden="true" />
      </span>

      <span className="collectible-body">
        <span className="collectible-kicker">
          {getPack(item.pack).name} · {typeLabel}
        </span>
        <span className="collectible-name">{item.name}</span>
        <span className="collectible-row">
          <RarityBadge rarity={item.rarity} />
          <PriceTag listing={item.listing} />
        </span>
        <AvailabilityBadge item={item} />
      </span>
    </Link>
  );
}

export default CollectibleCard;
