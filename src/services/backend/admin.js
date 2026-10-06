import { callFunction } from "./client";
import { characterToRow, rowToCharacter, rowToWearable, wearableToRow } from "./mappers";

// Admin dashboard API (supabase/functions/admin). Every call carries a wallet
// sign-in for purpose "admin"; the function checks the wallet is on the
// admin allowlist.

export const adminSession = (session) => callFunction("admin", { action: "session" }, session);

export async function adminList(session) {
  const { characters, wearables } = await callFunction("admin", { action: "list" }, session);
  return { characters: characters.map(rowToCharacter), wearables: wearables.map(rowToWearable) };
}

export async function adminSaveWearable(session, wearable) {
  const { wearable: row } = await callFunction("admin", { action: "saveWearable", wearable: wearableToRow(wearable) }, session);
  return rowToWearable(row);
}

export async function adminSaveCharacter(session, character) {
  const { character: row } = await callFunction(
    "admin",
    { action: "saveCharacter", character: characterToRow(character) },
    session,
  );
  return rowToCharacter(row);
}

export const adminDelete = (session, kind, id) =>
  callFunction("admin", { action: kind === "character" ? "deleteCharacter" : "deleteWearable", id }, session);

// Uploads a PNG/WebP to the catalogue bucket → { url, path }.
export async function adminUpload(session, folder, file) {
  const buffer = await file.arrayBuffer();
  let bin = "";
  new Uint8Array(buffer).forEach((b) => (bin += String.fromCharCode(b)));
  return callFunction("admin", { action: "upload", folder, contentType: file.type, data: btoa(bin) }, session);
}

// NFT lifecycle (supabase/functions/admin/nft.ts). `action` is one of
// nftStatus, previewMetadata, generateMetadata, prepareMint, confirmMint,
// prepareSale, confirmSale; payload carries { kind, id, network, … }.
export const adminNft = (session, action, payload) => callFunction("admin", { action, ...payload }, session);

// NFT registry (supabase/functions/admin/registry.ts): every minted copy and
// its owner as last read from the chain. Syncing re-reads the chain; there is
// no call that sets an owner.
export const adminNftList = (session, network) => callFunction("admin", { action: "nftList", network }, session);
export const adminNftDetail = (session, id) => callFunction("admin", { action: "nftDetail", id }, session);
export const adminNftSync = (session, id) => callFunction("admin", { action: "nftSync", id }, session);
export const adminNftSyncAll = (session, network) => callFunction("admin", { action: "nftSyncAll", network }, session);
