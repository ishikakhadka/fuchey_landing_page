// Wallet sign-in for the edge functions.
//
// The client asks the wallet to sign a short plain-text message (no
// transaction, no fee) and sends it with every request in the
// `x-fuchey-session` header as base64(JSON { wallet, message, signature }).
// We check the ed25519 signature against the wallet's public key, that the
// message names this wallet and purpose, and that it was issued recently.
//
// Message format (built by src/services/backend/session.js):
//   Sign in to Fuchey
//   Purpose: admin
//   Wallet: <base58 address>
//   Network: devnet
//   Issued: <ISO timestamp>
//   …free text…

import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6.0.0";
import { HttpError } from "./http.ts";

const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_SKEW_MS = 5 * 60 * 1000;

export type Purpose = "admin" | "loadout";

function field(message: string, name: string) {
  const line = message.split("\n").find((l) => l.startsWith(`${name}: `));
  return line?.slice(name.length + 2).trim();
}

function b64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function verifySession(req: Request, purpose: Purpose): string {
  const header = req.headers.get("x-fuchey-session");
  if (!header) throw new HttpError(401, "Sign in with your wallet first.");

  let wallet: string, message: string, signature: string;
  try {
    ({ wallet, message, signature } = JSON.parse(new TextDecoder().decode(b64(header))));
  } catch {
    throw new HttpError(401, "Malformed session.");
  }

  if (!message?.startsWith("Sign in to Fuchey\n")) throw new HttpError(401, "Unexpected sign-in message.");
  if (field(message, "Purpose") !== purpose) throw new HttpError(401, "This sign-in was for something else.");
  if (field(message, "Wallet") !== wallet) throw new HttpError(401, "Sign-in wallet mismatch.");

  const issued = Date.parse(field(message, "Issued") ?? "");
  const age = Date.now() - issued;
  if (!Number.isFinite(issued) || age > MAX_AGE_MS || age < -MAX_SKEW_MS) {
    throw new HttpError(401, "Sign-in expired. Please sign in again.");
  }

  let ok = false;
  try {
    const key = bs58.decode(wallet);
    ok = key.length === 32 && nacl.sign.detached.verify(new TextEncoder().encode(message), b64(signature), key);
  } catch {
    ok = false;
  }
  if (!ok) throw new HttpError(401, "Invalid wallet signature.");

  return wallet;
}
