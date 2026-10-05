import { Link } from "react-router";
import { Check } from "lucide-react";
import ItemArt from "../marketplace/ItemArt";
import RarityBadge from "../marketplace/RarityBadge";
import { useCatalog } from "../../context/CatalogContext";
import { shortAddress } from "../../utils/format";

// One owned on-chain asset: { address, name, itemId } from services/nft/assets.
function AssetCard({ asset }) {
  const { findItem } = useCatalog();
  const item = findItem(asset.itemId);
  if (!item) return null;

  return (
    <Link to={`/collection/${asset.address}`} className="asset-card">
      <span className={`asset-card-art character-stage stage-${item.edition ?? "companion"} kind-${item.kind}`}>
        <ItemArt art={item.art} alt={asset.name} itemId={item.id} size={item.kind === "character" ? "md" : "sm"} />
      </span>

      <span className="asset-card-body">
        <span className="asset-card-name">{asset.name}</span>
        <span className="asset-card-sub">
          <RarityBadge rarity={item.rarity} />
          <span className="mono muted">{shortAddress(asset.address, 4)}</span>
        </span>
        <span className="flag is-owned">
          <Check size={11} strokeWidth={3} /> Owned
        </span>
      </span>
    </Link>
  );
}

export default AssetCard;
