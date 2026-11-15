export function shortAddress(address, chars = 5) {
  if (!address) return "";
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatSol(amount) {
  if (amount == null) return "—";
  if (amount === 0) return "Free";
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

// A catalogue price in its own currency: "0.5 SOL", "$4.99", "Free", "TBA".
export function formatPrice(listing) {
  if (listing?.price == null) return "TBA";
  if (listing.price === 0) return "Free";
  if (listing.currency === "usd") {
    return listing.price.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }
  return formatSol(listing.price);
}

export function formatCount(n) {
  return n == null ? "—" : n.toLocaleString();
}
