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
} from "../_shared/studio.ts";

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

        const { data: renders } = await db.from("studio_renders").select("id, path, bytes").eq("version_id", id).eq("uploaded", false);
        const missing: string[] = [];
        for (const r of renders ?? []) {
          const dir = r.path.slice(0, r.path.lastIndexOf("/"));
          const file = r.path.slice(r.path.lastIndexOf("/") + 1);
          const { data: found } = await db.storage.from(STUDIO_BUCKET).list(dir, { search: file, limit: 5 });
          if (!(found ?? []).some((o) => o.name === file)) missing.push(r.path);
        }
        if (missing.length) throw new HttpError(400, `${missing.length} file(s) didn’t arrive. Publish again.`, missing);
        if (renders?.length) {
          const { error } = await db.from("studio_renders").update({ uploaded: true }).in("id", renders.map((r) => r.id));
          fail(error);
        }
        const { data, error } = await db.from("studio_versions").update({ status: "in_review" }).eq("id", id).select().single();
        fail(error);
        return json({ version: data });
      }

      default:
        throw new HttpError(400, "Unknown action.");
    }
  }),
);
