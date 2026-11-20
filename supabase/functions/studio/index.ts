// Animator studio API: the Fuchey Animator signs in here and publishes
// characters. Every request carries a wallet sign-in for purpose "studio"
// from an admin (public.admins) or an artist (public.studio_members).
//
// POST { action, ... }
//   session                    → { wallet, role }
//   list                       → { characters }   every character with its versions and files
//   startPublish { pack, character, info, animations, artCheck, files }
//                              → { versionId, version, uploads: [{ index, url, path }] }
//       Creates the next version of (pack, character) and returns a one-time
//       upload link for each file that isn't stored yet. Files whose content
//       (sha256) this character already has are reused, not uploaded again.
//   finishPublish { versionId } → { version }   checks every file arrived, then sends it for review
//   listWearables              → { wearables }    every wardrobe item with its versions, fits and files
//   startWearablePublish / finishWearablePublish
//       The same for a wardrobe item and how it sits on each character it fits
//       (see startWearablePublish below and migrations/20261120000000_studio_wearables.sql).
//
// The animator uploads the GIFs straight to storage with the signed links, so
// large files never pass through this function.

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { verifySession } from "../_shared/session.ts";
import {
  MAX_FILES,
  MAX_RENDER_BYTES,
  publicSignedUrl,
  STUDIO_BUCKET,
  studioCatalogue,
  studioRole,
  studioWardrobe,
} from "../_shared/studio.ts";
import { ANIMATOR_SLOTS, checkFit, SITE_SLOT, siteFit } from "../_shared/wardrobeFit.js";

const ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const ANIM = /^[a-z0-9_-]{1,64}$/;
const SHA = /^[0-9a-f]{64}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : null);

type FileIn = {
  kind: "gif" | "preview";
  animation: string;
  scale: number;
  width: number;
  height: number;
  frames: number;
  duration_ms: number;
  bytes: number;
  sha256: string;
};

function validateFiles(input: unknown): FileIn[] {
  if (!Array.isArray(input) || !input.length || input.length > MAX_FILES) {
    throw new HttpError(400, `Send between 1 and ${MAX_FILES} files.`);
  }
  const seen = new Set<string>();
  const problems: string[] = [];
  const files = input.map((f, i): FileIn | null => {
    if (!isObj(f)) return problems.push(`files[${i}]: not an object`), null;
    const kind = f.kind === "gif" || f.kind === "preview" ? f.kind : null;
    const animation = kind === "preview" ? "" : typeof f.animation === "string" && ANIM.test(f.animation) ? f.animation : null;
    const ok =
      kind && animation !== null &&
      int(f.scale, 1, 8) && int(f.width, 1, 4096) && int(f.height, 1, 4096) &&
      int(f.frames ?? 1, 1, 10000) && int(f.duration_ms ?? 0, 0, 3_600_000) &&
      int(f.bytes, 1, MAX_RENDER_BYTES) && typeof f.sha256 === "string" && SHA.test(f.sha256);
    if (!ok) return problems.push(`files[${i}]: needs kind, animation, scale 1–8, width, height, bytes ≤ 20 MB and a sha256`), null;
    const key = `${kind}:${animation}:${f.scale}`;
    if (seen.has(key)) return problems.push(`files[${i}]: ${key} is listed twice`), null;
    seen.add(key);
    return {
      kind: kind!, animation: animation!, scale: f.scale as number, width: f.width as number, height: f.height as number,
      frames: (f.frames as number) ?? 1, duration_ms: (f.duration_ms as number) ?? 0, bytes: f.bytes as number, sha256: f.sha256 as string,
    };
  });
  if (problems.length) throw new HttpError(400, "Some files can’t be published.", problems);
  if (!files.some((f) => f!.kind === "gif")) throw new HttpError(400, "Publish at least one animation GIF.");
  return files as FileIn[];
}

Deno.serve(
  handler(async (req) => {
    const wallet = verifySession(req, "studio");
    const db = serviceClient();
    const role = await studioRole(db, wallet);
    if (!role) throw new HttpError(403, "This wallet isn’t allowed in the Fuchey Animator. Ask an admin to add it.");

    const body = await req.json().catch(() => ({}));
    const fail = (error: { message: string } | null) => {
      if (error) throw new HttpError(400, error.message);
    };

    switch (body.action) {
      case "session":
        return json({ wallet, role });

      case "list":
        return json({ characters: await studioCatalogue(db) });

      case "startPublish": {
        const pack = isObj(body.pack) ? body.pack : {};
        const character = isObj(body.character) ? body.character : {};
        const packId = typeof pack.id === "string" && ID.test(pack.id) ? pack.id : null;
        const charId = typeof character.id === "string" && ID.test(character.id) ? character.id : null;
        const packName = text(pack.name, 80);
        const name = text(character.name, 80);
        if (!packId || !charId || !packName || !name) throw new HttpError(400, "Pack and character need an id and a name.");

        const artCheck = isObj(body.artCheck) ? body.artCheck : {};
        const errors = Number(artCheck.errors ?? 0);
        if (errors > 0) throw new HttpError(400, `The art check found ${errors} problem(s). Fix them before publishing.`);

        const files = validateFiles(body.files);
        const animations = isObj(body.animations) ? body.animations : {};
        const info = isObj(body.info) ? body.info : {};
        if (JSON.stringify(animations).length > 2_000_000 || JSON.stringify(info).length > 200_000) {
          throw new HttpError(400, "The animation data is too large.");
        }

        // The character (created on its first publish, renamed if the animator renamed it).
        const { data: existing } = await db.from("studio_characters").select("*").eq("pack_id", packId).eq("character_id", charId).maybeSingle();
        const bodyType = typeof character.bodyType === "string" ? character.bodyType.slice(0, 40) : null;
        let row = existing;
        if (!row) {
          const { data, error } = await db
            .from("studio_characters")
            .insert({ pack_id: packId, character_id: charId, pack_name: packName, name, body_type: bodyType })
            .select()
            .single();
          fail(error);
          row = data;
        }
        const version = (row.latest_version ?? 0) + 1;
        const { error: cerr } = await db
          .from("studio_characters")
          .update({ pack_name: packName, name, body_type: bodyType, latest_version: version })
          .eq("id", row.id)
          .eq("latest_version", row.latest_version); // someone else publishing at the same moment → retry
        fail(cerr);

        const { data: ver, error: verr } = await db
          .from("studio_versions")
          .insert({
            character: row.id,
            version,
            status: "uploading",
            info,
            animations,
            art_check: { errors: 0, warnings: Number(artCheck.warnings ?? 0) || 0 },
            submitted_by: wallet,
          })
          .select()
          .single();
        if (verr) throw new HttpError(409, "Another publish of this character is in progress. Try again.");

        // Files this character already has with the same content are reused.
        const { data: oldVersions } = await db.from("studio_versions").select("id").eq("character", row.id);
        const { data: known } = await db
          .from("studio_renders")
          .select("sha256, path")
          .in("version_id", (oldVersions ?? []).map((v) => v.id))
          .eq("uploaded", true)
          .in("sha256", files.map((f) => f.sha256));
        const byHash = new Map((known ?? []).map((k) => [k.sha256, k.path]));

        const uploads: { index: number; url: string; path: string }[] = [];
        const rows = [];
        for (const [index, f] of files.entries()) {
          const reuse = byHash.get(f.sha256);
          const ext = f.kind === "gif" ? "gif" : "png";
          const stem = f.kind === "preview" ? "preview" : f.animation;
          const path = reuse ?? `${packId}/${charId}/v${version}/${stem}@${f.scale}x-${f.sha256.slice(0, 12)}.${ext}`;
          rows.push({ version_id: ver.id, ...f, path, uploaded: Boolean(reuse) });
          if (!reuse) {
            const { data: signed, error } = await db.storage.from(STUDIO_BUCKET).createSignedUploadUrl(path, { upsert: true });
            fail(error);
            uploads.push({ index, url: publicSignedUrl(signed!.signedUrl), path });
          }
        }
        const { error: rerr } = await db.from("studio_renders").insert(rows);
        fail(rerr);

        return json({ versionId: ver.id, version, uploads, reused: files.length - uploads.length });
      }

      case "finishPublish": {
        const id = Number(body.versionId);
        const { data: ver } = await db.from("studio_versions").select("*").eq("id", id).maybeSingle();
        if (!ver) throw new HttpError(404, "Unknown version.");
        if (ver.submitted_by !== wallet && role !== "admin") throw new HttpError(403, "Only whoever published this can finish it.");
        if (ver.status !== "uploading") return json({ version: ver });

        await confirmUploads(db, "studio_renders", id);
        const { data, error } = await db.from("studio_versions").update({ status: "in_review" }).eq("id", id).select().single();
        fail(error);
        return json({ version: data });
      }

      case "listWearables":
        return json({ wearables: await studioWardrobe(db) });

      case "startWearablePublish":
        return json(await startWearablePublish(db, wallet, body));

      case "finishWearablePublish": {
        const id = Number(body.versionId);
        const { data: ver } = await db.from("studio_wearable_versions").select("*").eq("id", id).maybeSingle();
        if (!ver) throw new HttpError(404, "Unknown version.");
        if (ver.submitted_by !== wallet && role !== "admin") throw new HttpError(403, "Only whoever published this can finish it.");
        if (ver.status !== "uploading") return json({ version: ver });
        await confirmUploads(db, "studio_wearable_files", id);
        const { data, error } = await db.from("studio_wearable_versions").update({ status: "in_review" }).eq("id", id).select().single();
        fail(error);
        return json({ version: data });
      }

      default:
        throw new HttpError(400, "Unknown action.");
    }
  }),
);

type Db = ReturnType<typeof serviceClient>;

// Every not-yet-uploaded file of a version must now be in storage; marks them uploaded.
async function confirmUploads(db: Db, table: "studio_renders" | "studio_wearable_files", versionId: number) {
  const { data: rows } = await db.from(table).select("id, path").eq("version_id", versionId).eq("uploaded", false);
  const missing: string[] = [];
  for (const r of rows ?? []) {
    const dir = r.path.slice(0, r.path.lastIndexOf("/"));
    const file = r.path.slice(r.path.lastIndexOf("/") + 1);
    const { data: found } = await db.storage.from(STUDIO_BUCKET).list(dir, { search: file, limit: 5 });
    if (!(found ?? []).some((o) => o.name === file)) missing.push(r.path);
  }
  if (missing.length) throw new HttpError(400, `${missing.length} file(s) didn’t arrive. Publish again.`, missing);
  if (rows?.length) {
    const { error } = await db.from(table).update({ uploaded: true }).in("id", rows.map((r) => r.id));
    if (error) throw new HttpError(400, error.message);
  }
}

// ---------------------------------------------------------------------------
// Wardrobe: startWearablePublish
//   { pack: { id, name }, wearable: { slot, item, name }, scale, fits: [Fit], files: [File], artCheck, info }
//   Fit  = { character, canvas: [W, H], unit, arms, offset: [x, y], box: { x, y, w, h }, layer: { order }, animation }
//   File = { fit: index | null, kind: front | back | preview | gif (per fit) | icon (fit null),
//            animation, scale, width, height, frames, duration_ms, bytes, sha256 }
// → { versionId, version, uploads: [{ index, url, path }], reused }
// ---------------------------------------------------------------------------

const ITEM = /^[a-z0-9][a-z0-9_]{0,47}$/;
const FIT_KINDS = ["front", "back", "preview", "gif"];

type FitIn = NonNullable<ReturnType<typeof checkFit>["fit"]>;
type WFile = {
  fit: number | null; kind: string; animation: string; scale: number; width: number; height: number;
  frames: number; duration_ms: number; bytes: number; sha256: string;
};

async function startWearablePublish(db: Db, wallet: string, body: Obj) {
  const pack = isObj(body.pack) ? body.pack : {};
  const item = isObj(body.wearable) ? body.wearable : {};
  const packId = typeof pack.id === "string" && ID.test(pack.id) ? pack.id : null;
  const packName = text(pack.name, 80);
  const slot = typeof item.slot === "string" && ANIMATOR_SLOTS.includes(item.slot) ? item.slot : null;
  const itemId = typeof item.item === "string" && ITEM.test(item.item) ? item.item : null;
  const name = text(item.name, 80);
  if (!packId || !packName || !slot || !itemId || !name) throw new HttpError(400, "The item needs a pack, a slot, an item id and a name.");

  const artCheck = isObj(body.artCheck) ? body.artCheck : {};
  const errors = Number(artCheck.errors ?? 0);
  if (errors > 0) throw new HttpError(400, `The art check found ${errors} problem(s). Fix them before publishing.`);

  const s = body.scale as number;
  if (!int(s, 1, 8)) throw new HttpError(400, "scale: the export scale, 1–8.");

  // Fits: one per character, each checked here and placed on the website grid below.
  if (!Array.isArray(body.fits) || !body.fits.length || body.fits.length > 64) throw new HttpError(400, "Send between 1 and 64 fits.");
  const problems: string[] = [];
  const fits: (FitIn | null)[] = body.fits.map((f: unknown, i: number) => {
    const r = checkFit(f, i, slot);
    if (r.problems) problems.push(...r.problems);
    return r.fit ?? null;
  });
  const chars = new Set<string>();
  fits.forEach((f, i) => {
    if (!f) return;
    if (chars.has(f.character)) problems.push(`fits[${i}]: ${f.character} is listed twice`);
    chars.add(f.character);
  });

  // Files: each belongs to a fit (front, back, preview, gif) or to the item (icon).
  if (!Array.isArray(body.files) || !body.files.length || body.files.length > MAX_FILES) {
    throw new HttpError(400, `Send between 1 and ${MAX_FILES} files.`);
  }
  const seen = new Set<string>();
  const files: (WFile | null)[] = body.files.map((f: unknown, i: number) => {
    const at = `files[${i}]`;
    if (!isObj(f)) return problems.push(`${at}: not an object`), null;
    const fit = f.fit == null ? null : int(f.fit, 0, fits.length - 1) ? (f.fit as number) : -1;
    const kind = typeof f.kind === "string" ? f.kind : "";
    const ok =
      fit !== -1 && (fit === null ? kind === "icon" : FIT_KINDS.includes(kind)) &&
      (kind !== "gif" || (typeof f.animation === "string" && ANIM.test(f.animation))) &&
      int(f.scale, 1, 8) && int(f.width, 1, 4096) && int(f.height, 1, 4096) &&
      int(f.frames ?? 1, 1, 10000) && int(f.duration_ms ?? 0, 0, 3_600_000) &&
      int(f.bytes, 1, MAX_RENDER_BYTES) && typeof f.sha256 === "string" && SHA.test(f.sha256);
    if (!ok) return problems.push(`${at}: needs fit (null for the icon), kind, scale 1–8, width, height, bytes ≤ 20 MB and a sha256`), null;
    const animation = kind === "gif" ? (f.animation as string) : "";
    const key = `${fit}:${kind}:${animation}:${f.scale}`;
    if (seen.has(key)) return problems.push(`${at}: ${key} is listed twice`), null;
    seen.add(key);
    // A layer must be exactly the fit's box at the export scale, or the placement would be off.
    const box = fit !== null ? fits[fit]?.placement.box : null;
    if ((kind === "front" || kind === "back") && box && (f.scale !== s || f.width !== box.w * s || f.height !== box.h * s)) {
      problems.push(`${at}: a ${kind} layer must be the fit's box at ${s}× (${box.w * s}×${box.h * s})`);
    }
    return {
      fit, kind, animation, scale: f.scale as number, width: f.width as number, height: f.height as number,
      frames: (f.frames as number) ?? 1, duration_ms: (f.duration_ms as number) ?? 0, bytes: f.bytes as number, sha256: f.sha256 as string,
    };
  });
  fits.forEach((f, i) => {
    if (f && !files.some((x) => x && x.fit === i && (x.kind === "front" || x.kind === "back"))) problems.push(`fits[${i}]: needs a front or a back layer`);
  });
  if (problems.length) throw new HttpError(400, "This item can’t be published.", problems);

  // The item (created on its first publish, renamed if the animator renamed it), then its next version.
  const { data: existing } = await db.from("studio_wearables").select("*").eq("pack_id", packId).eq("slot", slot).eq("item_id", itemId).maybeSingle();
  let row = existing;
  if (!row) {
    const { data, error } = await db.from("studio_wearables").insert({ pack_id: packId, slot, item_id: itemId, pack_name: packName, name }).select().single();
    if (error) throw new HttpError(400, error.message);
    row = data;
  }
  const version = (row.latest_version ?? 0) + 1;
  const { error: uerr } = await db
    .from("studio_wearables")
    .update({ pack_name: packName, name, latest_version: version })
    .eq("id", row.id)
    .eq("latest_version", row.latest_version); // someone else publishing at the same moment → the insert below fails
  if (uerr) throw new HttpError(400, uerr.message);

  const info = { slot, item: itemId, siteSlot: SITE_SLOT[slot as keyof typeof SITE_SLOT], scale: s, source: isObj(body.info) ? body.info : {} };
  const { data: ver, error: verr } = await db
    .from("studio_wearable_versions")
    .insert({
      wearable: row.id,
      version,
      status: "uploading",
      info,
      art_check: { errors: 0, warnings: Number(artCheck.warnings ?? 0) || 0 },
      submitted_by: wallet,
    })
    .select()
    .single();
  if (verr) throw new HttpError(409, "Another publish of this item is in progress. Try again.");

  const ok = fits as FitIn[];
  const { data: savedFits, error: ferr } = await db
    .from("studio_wearable_fits")
    .insert(
      ok.map((f) => ({
        version_id: ver.id,
        character_id: f.character,
        canvas_w: f.canvas[0],
        canvas_h: f.canvas[1],
        unit: f.unit,
        arms: f.arms,
        placement: f.placement,
        site: siteFit({ canvas: f.canvas, offset: f.placement.offset, box: f.placement.box }, s),
        animation: f.animation,
      })),
    )
    .select("id, character_id");
  if (ferr) throw new HttpError(400, ferr.message);
  const fitId = (i: number) => savedFits!.find((x) => x.character_id === ok[i].character)!.id;

  // Files this item already has with the same content are reused.
  const list = files as WFile[];
  const { data: oldVersions } = await db.from("studio_wearable_versions").select("id").eq("wearable", row.id);
  const { data: known } = await db
    .from("studio_wearable_files")
    .select("sha256, path")
    .in("version_id", (oldVersions ?? []).map((v) => v.id))
    .eq("uploaded", true)
    .in("sha256", list.map((f) => f.sha256));
  const byHash = new Map((known ?? []).map((k) => [k.sha256, k.path]));

  const uploads: { index: number; url: string; path: string }[] = [];
  const rows = [];
  for (const [index, f] of list.entries()) {
    const reuse = byHash.get(f.sha256);
    const ext = f.kind === "gif" ? "gif" : "png";
    const who = f.fit === null ? "_item" : ok[f.fit].character;
    const stem = f.kind === "gif" ? `gif-${f.animation}` : f.kind;
    // "_wardrobe/" can't collide with character art: pack ids start with a letter or digit.
    const path = reuse ?? `_wardrobe/${packId}/${slot}_${itemId}/v${version}/${who}/${stem}@${f.scale}x-${f.sha256.slice(0, 12)}.${ext}`;
    const { fit, ...rest } = f;
    rows.push({ version_id: ver.id, fit_id: fit === null ? null : fitId(fit), ...rest, path, uploaded: Boolean(reuse) });
    if (!reuse) {
      const { data: signed, error } = await db.storage.from(STUDIO_BUCKET).createSignedUploadUrl(path, { upsert: true });
      if (error) throw new HttpError(400, error.message);
      uploads.push({ index, url: publicSignedUrl(signed!.signedUrl), path });
    }
  }
  const { error: rerr } = await db.from("studio_wearable_files").insert(rows);
  if (rerr) throw new HttpError(400, rerr.message);
  return { versionId: ver.id, version, uploads, reused: list.length - uploads.length };
}
