export function shortAddress(address, chars = 5) {
  if (!address) return "";
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatSol(amount) {
  if (amount == null) return "—";
  if (amount === 0) return "Free";
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

export function formatCount(n) {
  return n == null ? "—" : n.toLocaleString();
}
