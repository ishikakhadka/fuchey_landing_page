export function formatPrice(price) {
  if (price == null) return "no price";
  return price === 0 ? "free" : `${price} SOL`;
}

// "just now", "2 min ago", "3 hours ago"
export function timeAgo(iso, now = Date.now()) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const shortAddress = (s) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : "—");
