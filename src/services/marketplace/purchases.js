import { NETWORK } from "../../config/network";
import { callFunction } from "../backend/client";

// Server-side verification of a confirmed purchase (supabase/functions/
// purchase-verify): the backend re-reads the transaction and the new asset
// from Solana before recording it. A purchase only counts once this passes.
//
// Confirmation can reach the RPC the backend uses a moment later than ours,
// so "not found yet" is retried briefly.
export async function verifyPurchase({ signature, asset, wallet }, { attempts = 5 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callFunction("purchase-verify", { network: NETWORK.id, signature, asset, wallet });
    } catch (error) {
      lastError = error;
      if (error.status !== 409 || !/not found|not confirmed/.test(error.message)) throw error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError;
}
