// Shared pieces of the animator studio (functions/studio and the admin's
// studio* actions). See supabase/migrations/20261117000000_studio.sql.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

export const STUDIO_BUCKET = "studio-art";
export const MAX_RENDER_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 300;

// Inside the local function runtime SUPABASE_URL is an internal Docker host,
// so local setups set PUBLIC_SUPABASE_URL (supabase/functions/.env).
export const PUBLIC_URL = (Deno.env.get("PUBLIC_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!).replace(/\/$/, "");

export const publicUrl = (path: string) => `${PUBLIC_URL}/storage/v1/object/public/${STUDIO_BUCKET}/${path}`;

// Signed upload links come back on the internal host locally; point them at
// the public one so a browser can use them.
export function publicSignedUrl(url: string) {
  const u = new URL(url);
  const pub = new URL(PUBLIC_URL);
  u.protocol = pub.protocol;
  u.host = pub.host;
  // supabase-js returns /object/upload/sign/… relative to /storage/v1
  if (!u.pathname.startsWith("/storage/v1/")) u.pathname = `/storage/v1${u.pathname}`;
  return u.toString();
}

// May this wallet use the animator? Admins always; artists if listed.
export async function studioRole(db: SupabaseClient, wallet: string): Promise<"admin" | "artist" | null> {
  const [{ data: admin }, { data: member }] = await Promise.all([
    db.from("admins").select("wallet").eq("wallet", wallet).maybeSingle(),
    db.from("studio_members").select("wallet").eq("wallet", wallet).maybeSingle(),
  ]);
  return admin ? "admin" : member ? "artist" : null;
}

// Characters with their versions and files, newest version first.
export async function studioCatalogue(db: SupabaseClient, { approvedOnly = false } = {}) {
  const { data: chars, error } = await db.from("studio_characters").select("*").order("pack_id").order("name");
  if (error) throw new HttpError(400, error.message);
  const ids = (chars ?? []).map((c) => c.id);
  if (!ids.length) return [];
  let vq = db.from("studio_versions").select("*").in("character", ids).neq("status", "uploading").order("version", { ascending: false });
  if (approvedOnly) vq = vq.eq("status", "approved");
  const { data: versions, error: verr } = await vq;
  if (verr) throw new HttpError(400, verr.message);
  const vids = (versions ?? []).map((v) => v.id);
  const { data: renders, error: rerr } = vids.length
    ? await db.from("studio_renders").select("*").in("version_id", vids).order("animation").order("scale")
    : { data: [], error: null };
  if (rerr) throw new HttpError(400, rerr.message);

  return (chars ?? [])
    .map((c) => ({
      ...c,
      versions: (versions ?? [])
        .filter((v) => v.character === c.id)
        .map((v) => ({
          ...v,
          renders: (renders ?? [])
            .filter((r) => r.version_id === v.id)
            .map((r) => ({ ...r, url: publicUrl(r.path) })),
        })),
    }))
    .filter((c) => c.versions.length);
}

// Wardrobe items with their versions, fits and files, newest version first.
// Each fit carries `files: { front, back, preview }` as public URLs.
export async function studioWardrobe(db: SupabaseClient) {
  const { data: items, error } = await db.from("studio_wearables").select("*").order("pack_id").order("slot").order("name");
  if (error) throw new HttpError(400, error.message);
  const ids = (items ?? []).map((w) => w.id);
  if (!ids.length) return [];
  const { data: versions, error: verr } = await db
    .from("studio_wearable_versions")
    .select("*")
    .in("wearable", ids)
    .neq("status", "uploading")
    .order("version", { ascending: false });
  if (verr) throw new HttpError(400, verr.message);
  const vids = (versions ?? []).map((v) => v.id);
  const [fits, files] = vids.length
    ? await Promise.all([
        db.from("studio_wearable_fits").select("*").in("version_id", vids).order("character_id"),
        db.from("studio_wearable_files").select("*").in("version_id", vids).order("kind"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (fits.error) throw new HttpError(400, fits.error.message);
  if (files.error) throw new HttpError(400, files.error.message);
  const withUrl = (f: { path: string }) => ({ ...f, url: publicUrl(f.path) });

  return (items ?? [])
    .map((w) => ({
      ...w,
      versions: (versions ?? [])
        .filter((v) => v.wearable === w.id)
        .map((v) => {
          const vfiles = (files.data ?? []).filter((f) => f.version_id === v.id).map(withUrl);
          return {
            ...v,
            files: vfiles.filter((f) => f.fit_id == null),
            fits: (fits.data ?? [])
              .filter((f) => f.version_id === v.id)
              .map((f) => {
                const own = vfiles.filter((x) => x.fit_id === f.id);
                const url = (kind: string) => own.find((x) => x.kind === kind)?.url ?? null;
                return { ...f, files: { front: url("front"), back: url("back"), preview: url("preview") }, renders: own };
              }),
          };
        }),
    }))
    .filter((w) => w.versions.length);
}
