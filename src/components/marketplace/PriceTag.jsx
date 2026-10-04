import { formatSol } from "../../utils/format";

function PriceTag({ listing, size = "md" }) {
  if (listing.price == null) {
    return <span className={`price-tag price-tag-${size} is-tba`}>TBA</span>;
  }

  return (
    <span className={`price-tag price-tag-${size} ${listing.price === 0 ? "is-free" : ""}`}>
      {formatSol(listing.price)}
    </span>
  );
}

export default PriceTag;
