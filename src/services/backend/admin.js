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
