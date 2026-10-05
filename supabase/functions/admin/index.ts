// Admin API for the catalogue. Every request must carry a wallet sign-in for
// purpose "admin" from a wallet in public.admins.
//
// POST { action, ... }
//   session                       → { wallet }
//   list                          → { characters, wearables }  (drafts included)
//   saveWearable  { wearable }    → { wearable }
//   saveCharacter { character }   → { character }
//   deleteWearable / deleteCharacter { id }
//   upload { folder, contentType, data (base64) } → { url, path }
//
// Listing an item here never mints anything: NFT addresses are references to
// assets created separately (nft/setup-marketplace.mjs or another tool).

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { verifySession } from "../_shared/session.ts";
import { validateCharacter, validateWearable } from "../_shared/validate.ts";

const BUCKET = "catalog-art";

// Public base URL for uploaded art. Inside the local function runtime
// SUPABASE_URL is an internal Docker hostname, so local setups set
// PUBLIC_SUPABASE_URL (supabase/functions/.env); hosted projects don't need to.
const PUBLIC_URL = (Deno.env.get("PUBLIC_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!).replace(/\/$/, "");
const MAX_UPLOAD = 2 * 1024 * 1024;

const PNG = [0x89, 0x50, 0x4e, 0x47];
const WEBP = [0x52, 0x49, 0x46, 0x46];
const starts = (bytes: Uint8Array, sig: number[]) => sig.every((b, i) => bytes[i] === b);

Deno.serve(
  handler(async (req) => {
    const wallet = verifySession(req, "admin");
    const db = serviceClient();

    const { data: admin } = await db.from("admins").select("wallet").eq("wallet", wallet).maybeSingle();
    if (!admin) throw new HttpError(403, "This wallet isn’t a Fuchey admin.");

    const body = await req.json().catch(() => ({}));
    const fail = (error: { message: string } | null) => {
      if (error) throw new HttpError(400, error.message);
    };

    switch (body.action) {
      case "session":
        return json({ wallet });

      case "list": {
        const [c, w] = await Promise.all([
          db.from("characters").select("*").order("sort_order"),
          db.from("wearables").select("*").order("sort_order"),
        ]);
        fail(c.error);
        fail(w.error);
        return json({ characters: c.data, wearables: w.data });
      }

      case "saveWearable": {
        const { data: chars } = await db.from("characters").select("id");
        const row = validateWearable(body.wearable, (chars ?? []).map((c) => c.id));
        const { data, error } = await db.from("wearables").upsert(row).select().single();
        fail(error);
        return json({ wearable: data });
      }

      case "saveCharacter": {
        const row = validateCharacter(body.character);
        const { data, error } = await db.from("characters").upsert(row).select().single();
        fail(error);
        return json({ character: data });
      }

      case "deleteWearable":
      case "deleteCharacter": {
        const table = body.action === "deleteWearable" ? "wearables" : "characters";
        const { error } = await db.from(table).delete().eq("id", String(body.id ?? ""));
        fail(error);
        return json({ ok: true });
      }

      case "upload": {
        const folder = String(body.folder ?? "");
        if (!/^(wearables|characters)\/[a-z0-9-]{2,48}$/.test(folder)) throw new HttpError(400, "Bad upload folder.");
        let bytes: Uint8Array;
        try {
          bytes = Uint8Array.from(atob(String(body.data ?? "")), (ch) => ch.charCodeAt(0));
        } catch {
          throw new HttpError(400, "Upload isn’t valid base64.");
        }
        if (!bytes.length || bytes.length > MAX_UPLOAD) throw new HttpError(400, "Images must be under 2 MB.");
        const type = starts(bytes, PNG) ? "image/png" : starts(bytes, WEBP) ? "image/webp" : null;
        if (!type) throw new HttpError(400, "Only PNG or WebP images.");

        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
          .slice(0, 8)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const path = `${folder}/${hash}.${type === "image/png" ? "png" : "webp"}`;
        const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
        fail(error);
        return json({ url: `${PUBLIC_URL}/storage/v1/object/public/${BUCKET}/${path}`, path });
      }

      default:
        throw new HttpError(400, "Unknown action.");
    }
  }),
);
