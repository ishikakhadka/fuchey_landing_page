import { useEffect, useState } from "react";

import { useContent } from "../context/ContentContext";
import { fetchSolUsd } from "../services/solPrice";
import { formatPrice } from "../utils/format";

// Today's SOL/USD rate, fetched at most once per page load.
let ratePromise = null;
const loadRate = () => (ratePromise ??= fetchSolUsd().catch(() => null));

// A price formatter that follows Admin → Home → "Show prices in". Prices
// set in the other currency are converted at today's rate (shown with ≈);
// if the rate can't be loaded, the price shows in the currency it was set in.
export function usePriceFormat() {
  const { settings } = useContent();
  const display = settings.priceDisplay === "usd" ? "usd" : "sol";
  const [rate, setRate] = useState(null);

  useEffect(() => {
    let active = true;
    loadRate().then((r) => active && setRate(r));
    return () => {
      active = false;
    };
  }, []);

  return (listing) => {
    if (listing?.price == null || listing.price === 0) return formatPrice(listing);
    const own = listing.currency === "usd" ? "usd" : "sol";
    if (own === display) return formatPrice(listing);
    // A USD item on an open sale has an exact SOL price.
    if (display === "sol" && listing.solPrice != null) return formatPrice({ price: listing.solPrice, currency: "sol" });
    if (!rate) return formatPrice(listing);
    const converted = display === "usd" ? listing.price * rate : listing.price / rate;
    return `≈ ${formatPrice({ price: Number(converted.toFixed(display === "usd" ? 2 : 4)), currency: display })}`;
  };
}
