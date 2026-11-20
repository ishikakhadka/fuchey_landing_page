// Admin side of the animator studio: review what artists publish from the
// Fuchey Animator, and manage who may sign in to it.
//
//   studioList                                   → { characters, members }
//   studioReview { versionId, decision, note }   → { version }   decision: "approve" | "reject"
//   studioAddMember { wallet, note }             → { member }
//   studioRemoveMember { wallet }                → { ok }
//   studioWearableList                           → { wearables, linked, imported }   wardrobe items from the animator
//   studioWearableReview { versionId, decision, note } → { version }
//   studioWearableVisual { versionId }           → { visual, compatibleCharacters, unmatched, icon, item, studio }
//       The website `visual` for an approved wardrobe version, built here with
//       _shared/wardrobeFit.js so the Wearable editor can't drift from the formula.
//       saveWearable then checks it with checkWearableStudio below.
//
// Importing an approved version into the marketplace happens in the
// Character editor: it fills the form from studioList and saves it with the
// normal saveCharacter action, which records the version in `characters.studio`.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { HttpError } from "../_shared/http.ts";
import { publicUrl, studioCatalogue, studioWardrobe } from "../_shared/studio.ts";
import { buildVisual } from "../_shared/wardrobeFit.js";

export const STUDIO_ACTIONS = [
  "studioList",
  "studioReview",
  "studioAddMember",
  "studioRemoveMember",
  "studioWearableList",
  "studioWearableReview",
  "studioWearableVisual",
];

const WALLET = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function studioAction(action: string, body: Record<string, unknown>, db: SupabaseClient, admin: string) {
  const fail = (error: { message: string } | null) => {
    if (error) throw new HttpError(400, error.message);
  };

  switch (action) {
    case "studioList": {
      const [characters, members] = await Promise.all([
        studioCatalogue(db),
        db.from("studio_members").select("*").order("created_at"),
      ]);
      fail(members.error);
      // Which marketplace characters came from which animator character.
      const { data: linked } = await db.from("characters").select("id, name, studio").not("studio", "is", null);
      return { characters, members: members.data, linked: linked ?? [] };
    }

    case "studioReview": {
      const id = Number(body.versionId);
      const decision = body.decision;
      if (decision !== "approve" && decision !== "reject") throw new HttpError(400, "Decision must be approve or reject.");
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) || null : null;
      if (decision === "reject" && !note) throw new HttpError(400, "Say what needs fixing so the artist knows.");

      const { data: ver } = await db.from("studio_versions").select("*").eq("id", id).maybeSingle();
      if (!ver) throw new HttpError(404, "Unknown version.");
      if (ver.status === "uploading") throw new HttpError(409, "This version is still uploading.");

      const { data, error } = await db
        .from("studio_versions")
        .update({
          status: decision === "approve" ? "approved" : "rejected",
          reviewed_by: admin,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq("id", id)
        .select()
        .single();
      fail(error);

      // The character's approved version is its newest approved one.
      const { data: approved } = await db
        .from("studio_versions")
        .select("version")
        .eq("character", ver.character)
        .eq("status", "approved")
        .order("version", { ascending: false })
        .limit(1);
      const { error: cerr } = await db
        .from("studio_characters")
        .update({ approved_version: approved?.[0]?.version ?? null })
        .eq("id", ver.character);
      fail(cerr);
      return { version: data };
    }

    case "studioAddMember": {
      const wallet = String(body.wallet ?? "").trim();
      if (!WALLET.test(wallet)) throw new HttpError(400, "That isn’t a Solana wallet address.");
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 120) || null : null;
      const { data, error } = await db.from("studio_members").upsert({ wallet, note, added_by: admin }).select().single();
      fail(error);
      return { member: data };
    }

    case "studioRemoveMember": {
      const { error } = await db.from("studio_members").delete().eq("wallet", String(body.wallet ?? ""));
      fail(error);
      return { ok: true };
    }

    // ---- Wardrobe ----------------------------------------------------------

    case "studioWearableList": {
      const [wearables, linked, imported] = await Promise.all([
        studioWardrobe(db),
        linkedCharacters(db),
        db.from("wearables").select("id, name, studio").not("studio", "is", null),
      ]);
      return { wearables, linked, imported: imported.data ?? [] };
    }

    case "studioWearableReview": {
      const id = Number(body.versionId);
      const decision = body.decision;
      if (decision !== "approve" && decision !== "reject") throw new HttpError(400, "Decision must be approve or reject.");
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) || null : null;
      if (decision === "reject" && !note) throw new HttpError(400, "Say what needs fixing so the artist knows.");

      const { data: ver } = await db.from("studio_wearable_versions").select("*").eq("id", id).maybeSingle();
      if (!ver) throw new HttpError(404, "Unknown version.");
      if (ver.status === "uploading") throw new HttpError(409, "This version is still uploading.");

      const { data, error } = await db
        .from("studio_wearable_versions")
        .update({
          status: decision === "approve" ? "approved" : "rejected",
          reviewed_by: admin,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq("id", id)
        .select()
        .single();
      fail(error);

      // The item's approved version is its newest approved one, so rejecting
      // a new version leaves the earlier approved one in place.
      const { data: approved } = await db
        .from("studio_wearable_versions")
        .select("version")
        .eq("wearable", ver.wearable)
        .eq("status", "approved")
        .order("version", { ascending: false })
        .limit(1);
      const { error: werr } = await db
        .from("studio_wearables")
        .update({ approved_version: approved?.[0]?.version ?? null })
        .eq("id", ver.wearable);
      fail(werr);
      return { version: data };
    }

    case "studioWearableVisual": {
      const built = await wearableVisual(db, Number(body.versionId));
      if (!built.visual) {
        throw new HttpError(
          400,
          "None of the characters this item fits is on the website yet. Import them from the animator first.",
          built.unmatched,
        );
      }
      return built;
    }
  }
  throw new HttpError(400, "Unknown action.");
}

// Marketplace characters imported from the animator: { pack, character, siteId, name }.
async function linkedCharacters(db: SupabaseClient) {
  const { data } = await db.from("characters").select("id, name, art, studio").not("studio", "is", null);
  return (data ?? []).map((c) => ({ pack: c.studio.pack, character: c.studio.character, version: c.studio.version, siteId: c.id, name: c.name, art: c.art }));
}

// The website visual for one approved wardrobe version.
async function wearableVisual(db: SupabaseClient, versionId: number) {
  const { data: ver } = await db.from("studio_wearable_versions").select("*").eq("id", versionId).maybeSingle();
  if (!ver) throw new HttpError(404, "Unknown version.");
  if (ver.status !== "approved") throw new HttpError(409, "Only an approved version can go on the website.");
  const { data: item } = await db.from("studio_wearables").select("*").eq("id", ver.wearable).single();
  const all = await studioWardrobe(db);
  const v = all.find((w) => w.id === item.id)?.versions.find((x: { id: number }) => x.id === ver.id);
  if (!v) throw new HttpError(404, "Unknown version.");
  const linked = await linkedCharacters(db);
  const siteIdOf = (character: string) => linked.find((l) => l.pack === item.pack_id && l.character === character)?.siteId ?? null;
  const built = buildVisual(item.slot, v.fits, siteIdOf);
  const icon = v.files.find((f: { kind: string }) => f.kind === "icon")?.url ?? null;
  return {
    ...built,
    icon,
    item: { pack: item.pack_id, packName: item.pack_name, slot: item.slot, item: item.item_id, name: item.name },
    studio: { pack: item.pack_id, slot: item.slot, item: item.item_id, version: ver.version },
  };
}

// saveWearable: a wearable that names an animator version must use exactly
// that approved version's art, so the site only ever shows approved art.
export async function checkWearableStudio(db: SupabaseClient, row: { studio: unknown; visual: unknown }) {
  const ref = row.studio as { pack: string; slot: string; item: string; version: number } | null;
  if (!ref) return;
  const { data: item } = await db.from("studio_wearables").select("id").eq("pack_id", ref.pack).eq("slot", ref.slot).eq("item_id", ref.item).maybeSingle();
  const { data: ver } = item
    ? await db.from("studio_wearable_versions").select("id, status").eq("wearable", item.id).eq("version", ref.version).maybeSingle()
    : { data: null };
  if (!ver || ver.status !== "approved") {
    throw new HttpError(400, `Animator version ${ref.version} of ${ref.slot}/${ref.item} isn’t approved. Approve it under Admin → Animator first.`);
  }
  const { data: files } = await db.from("studio_wearable_files").select("path").eq("version_id", ver.id);
  const allowed = new Set((files ?? []).map((f) => publicUrl(f.path)));
  const v = row.visual as Record<string, unknown>;
  const images: unknown[] = [v?.image, v?.backImage];
  for (const o of Object.values((v?.perCharacter ?? {}) as Record<string, Record<string, unknown>>)) images.push(o.image, o.backImage);
  const foreign = images.filter((u) => typeof u === "string" && !allowed.has(u));
  if (foreign.length) {
    throw new HttpError(400, `This wearable is linked to animator version ${ref.version}, but some of its pictures aren’t from that version. Import it again.`, foreign);
  }
}
