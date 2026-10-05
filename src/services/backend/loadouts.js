import { callFunction, select } from "./client";

// Loadouts: which wearable ids a wallet has equipped on a character
// ({ [slot]: wearableId }). Equipping is app state only — it never touches,
// transfers or burns the NFTs, which stay in the wallet.

export async function fetchLoadout(wallet, characterId) {
  const rows = await select("loadouts", {
    wallet: `eq.${wallet}`,
    character_id: `eq.${characterId}`,
  });
  return rows[0]?.slots ?? null;
}

// session: a wallet sign-in for purpose "loadout" (services/backend/session.js).
export async function saveLoadout({ characterId, slots, session }) {
  const { loadout } = await callFunction("loadout", { characterId, slots }, session);
  return loadout.slots;
}
