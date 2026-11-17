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
