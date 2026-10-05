import { NETWORK } from "../../config/network";

// Wallet sign-in for backend writes (admin dashboard, saving a loadout).
//
// The wallet signs a short plain-text message — not a transaction, so it
// costs nothing and can't move funds. The edge function verifies the
// signature against the wallet's public key (supabase/functions/_shared/
// session.ts). The signed message is kept for this browser tab only and
// reused until it's close to expiring, so the wallet asks once per session.

const TTL_MS = 11 * 60 * 60 * 1000; // server accepts 12h
const PURPOSE_TEXT = {
  admin: "Manage the Fuchey marketplace catalogue.",
  loadout: "Save what your Fuchey is wearing.",
};

const key = (purpose, wallet) => `fuchey-session:${purpose}:${wallet}`;

function encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function bytesToBase64(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function cachedSession(purpose, wallet) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(purpose, wallet)) ?? "null");
    return saved && Date.now() - saved.issued < TTL_MS ? saved.token : null;
  } catch {
    return null;
  }
}

export function clearSession(purpose, wallet) {
  try {
    sessionStorage.removeItem(key(purpose, wallet));
  } catch {
    // storage unavailable — nothing cached anyway
  }
}

// adapterWallet: the `signer` from hooks/useWallet.js (needs publicKey + signMessage).
export async function getSession(purpose, adapterWallet) {
  const wallet = adapterWallet?.publicKey?.toBase58();
  if (!wallet) throw new Error("Connect a wallet first.");

  const cached = cachedSession(purpose, wallet);
  if (cached) return cached;

  if (!adapterWallet.signMessage) throw new Error("This wallet can’t sign messages — try another Solana wallet.");

  const issued = Date.now();
  const message = [
    "Sign in to Fuchey",
    `Purpose: ${purpose}`,
    `Wallet: ${wallet}`,
    `Network: ${NETWORK.id}`,
    `Issued: ${new Date(issued).toISOString()}`,
    "",
    PURPOSE_TEXT[purpose],
    "This is not a transaction and costs nothing.",
  ].join("\n");

  const signature = await adapterWallet.signMessage(new TextEncoder().encode(message));
  const token = encode({ wallet, message, signature: bytesToBase64(signature) });

  try {
    sessionStorage.setItem(key(purpose, wallet), JSON.stringify({ token, issued }));
  } catch {
    // fine: we'll just ask again next time
  }
  return token;
}
