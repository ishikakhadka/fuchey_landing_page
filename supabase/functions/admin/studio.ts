// Admin side of the animator studio: review what artists publish from the
// Fuchey Animator, and manage who may sign in to it.
//
//   studioList                                   → { characters, members }
//   studioReview { versionId, decision, note }   → { version }   decision: "approve" | "reject"
//   studioAddMember { wallet, note }             → { member }
//   studioRemoveMember { wallet }                → { ok }
//
// Importing an approved version into the marketplace happens in the
// Character editor: it fills the form from studioList and saves it with the
// normal saveCharacter action, which records the version in `characters.studio`.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { HttpError } from "../_shared/http.ts";
import { studioCatalogue } from "../_shared/studio.ts";

export const STUDIO_ACTIONS = ["studioList", "studioReview", "studioAddMember", "studioRemoveMember"];

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
  }
  throw new HttpError(400, "Unknown action.");
}
