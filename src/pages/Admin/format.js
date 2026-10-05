export function formatPrice(price) {
  if (price == null) return "no price";
  return price === 0 ? "free" : `${price} SOL`;
}
