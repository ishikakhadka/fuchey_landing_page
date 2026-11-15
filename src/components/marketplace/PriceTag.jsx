import { formatSol } from "../../utils/format";
import { usePriceFormat } from "../../hooks/usePrice";

// The price in the currency picked in Admin → Home → "Show prices in". A USD
// price on an open sale also shows the SOL it charges (on the large tag).
function PriceTag({ listing, size = "md" }) {
  const format = usePriceFormat();
  if (listing.price == null) {
    return <span className={`price-tag price-tag-${size} is-tba`}>TBA</span>;
  }

  const showSol = size === "lg" && listing.currency === "usd" && listing.price > 0 && listing.solPrice != null;
  return (
    <span className={`price-tag price-tag-${size} ${listing.price === 0 ? "is-free" : ""}`}>
      {format(listing)}
      {showSol && !format(listing).includes("SOL") && <small className="price-tag-sol"> ≈ {formatSol(listing.solPrice)}</small>}
    </span>
  );
}

export default PriceTag;
