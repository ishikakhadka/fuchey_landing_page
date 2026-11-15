import { formatPrice, formatSol } from "../../utils/format";

// The price in the currency the admin set it in. A USD price on an open sale
// also shows the SOL the sale actually charges (on the large tag).
function PriceTag({ listing, size = "md" }) {
  if (listing.price == null) {
    return <span className={`price-tag price-tag-${size} is-tba`}>TBA</span>;
  }

  const showSol = size === "lg" && listing.currency === "usd" && listing.price > 0 && listing.solPrice != null;
  return (
    <span className={`price-tag price-tag-${size} ${listing.price === 0 ? "is-free" : ""}`}>
      {formatPrice(listing)}
      {showSol && <small className="price-tag-sol"> ≈ {formatSol(listing.solPrice)}</small>}
    </span>
  );
}

export default PriceTag;
