import { getRarity } from "../../services/marketplace/catalog";

function RarityBadge({ rarity }) {
  const { id, label } = getRarity(rarity);

  return (
    <span className={`rarity-badge rarity-${id}`}>
      <span className="rarity-gem" aria-hidden="true" />
      {label}
    </span>
  );
}

export default RarityBadge;
