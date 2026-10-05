// Saves what a wallet has equipped on one character.
//
// POST { characterId, slots: { [slot]: wearableId } }  with a wallet sign-in
// for purpose "loadout". Only ids are stored; equipping never touches the
// NFTs (ownership stays on-chain, in the wallet).
//
// Every slot is checked against the catalogue: the wearable must be
// published, fit that slot, and be compatible with the character.

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { verifySession } from "../_shared/session.ts";

Deno.serve(
  handler(async (req) => {
    const wallet = verifySession(req, "loadout");
    const db = serviceClient();
    const body = await req.json().catch(() => ({}));

    const characterId = String(body.characterId ?? "");
    const slots = body.slots && typeof body.slots === "object" && !Array.isArray(body.slots) ? body.slots : null;
    if (!slots) throw new HttpError(400, "Missing slots.");

    const { data: character } = await db
      .from("characters")
      .select("id, art, wardrobe_slots, published")
      .eq("id", characterId)
      .maybeSingle();
    if (!character?.published || character.art?.kind !== "character") {
      throw new HttpError(400, "That character can’t be dressed.");
    }

    const ids = Object.values(slots).map(String);
    const { data: items } = ids.length
      ? await db.from("wearables").select("id, type, compatible_characters, published").in("id", ids)
      : { data: [] };
    const byId = new Map((items ?? []).map((w) => [w.id, w]));

    const clean: Record<string, string> = {};
    const problems: string[] = [];
    for (const [slot, id] of Object.entries(slots)) {
      const w = byId.get(String(id));
      if (!w?.published) problems.push(`${id}: not in the catalogue`);
      else if (w.type !== slot) problems.push(`${id}: doesn’t go in the ${slot} slot`);
      else if (!character.wardrobe_slots.includes(slot)) problems.push(`${characterId} has no ${slot} slot`);
      else if (!w.compatible_characters.includes(characterId)) problems.push(`${id}: doesn’t fit ${characterId}`);
      else clean[slot] = w.id;
    }
    if (problems.length) throw new HttpError(400, "Some items can’t be equipped.", problems);

    const { data, error } = await db
      .from("loadouts")
      .upsert({ wallet, character_id: characterId, slots: clean })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    return json({ loadout: data });
  }),
);
