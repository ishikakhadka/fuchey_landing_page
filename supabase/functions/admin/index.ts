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
//   nftStatus / previewMetadata / generateMetadata / prepareMint / confirmMint /
//   prepareSale / confirmSale { kind, id, network, … }   (see nft.ts)
//   nftList / nftDetail / nftSync / nftSyncAll            (see registry.ts)
//   listContent                   → { drops, slides, settings }  (drafts and off slides included)
//   saveDrop { drop } / deleteDrop { id }
//   saveSlide { slide } / deleteSlide { id } / orderSlides { ids }
//   saveHomeSettings { settings } → { settings }
//
// Saving an asset never touches its `nft` field: that only changes through the
// NFT actions, after the chain has confirmed each step.

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { verifySession } from "../_shared/session.ts";
import { setPackIds, validateCharacter, validateDrop, validateHomeSettings, validatePack, validateSlide, validateWearable } from "../_shared/validate.ts";
import { nftAction } from "./nft.ts";
import { allowedNetworks, type Network } from "../_shared/nft/config.ts";
import { REGISTRY_ACTIONS, registryAction } from "./registry.ts";

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

    const NFT_ACTIONS = ["nftStatus", "previewMetadata", "generateMetadata", "prepareMint", "confirmMint", "prepareSale", "confirmSale", "prepareMetadataUpdate", "confirmMetadataUpdate"];
    if (NFT_ACTIONS.includes(body.action)) return json(await nftAction(body.action, body, db, wallet));
    if (REGISTRY_ACTIONS.includes(body.action)) return json(await registryAction(body.action, body, db));

    // Packs are the parents: their ids validate every row that names one,
    // and a character or wearable can only be published inside a published pack.
    const { data: packRows } = await db.from("packs").select("id, name, published");
    setPackIds((packRows ?? []).map((p) => p.id));
    const requirePublishedPack = (row: { pack: string; published: boolean }) => {
      const pack = (packRows ?? []).find((p) => p.id === row.pack);
      if (row.published && pack && !pack.published) {
        throw new HttpError(400, `${pack.name} is unpublished. Publish the pack first, or save this as a draft.`);
      }
    };

    // Deleting a deployed asset would orphan NFTs people own.
    const deployed = async (table: string, id: string) => {
      const { data } = await db.from(table).select("nft").eq("id", id).maybeSingle();
      return Object.values(data?.nft ?? {}).some((e) => (e as { status?: string })?.status === "minted");
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
        await requirePublishedPack(row);
        const { data, error } = await db.from("wearables").upsert(row).select().single();
        fail(error);
        return json({ wearable: data });
      }

      case "saveCharacter": {
        const row = validateCharacter(body.character);
        await requirePublishedPack(row);
        const { data, error } = await db.from("characters").upsert(row).select().single();
        fail(error);
        return json({ character: data });
      }

      case "deleteWearable":
      case "deleteCharacter": {
        const table = body.action === "deleteWearable" ? "wearables" : "characters";
        if (await deployed(table, String(body.id ?? ""))) {
          throw new HttpError(409, "This item is deployed on-chain and people may own it. End its listing instead of deleting it.");
        }
        const { error } = await db.from(table).delete().eq("id", String(body.id ?? ""));
        fail(error);
        return json({ ok: true });
      }

      case "listPacks": {
        const { data, error } = await db.from("packs").select("*").order("sort_order").order("id");
        fail(error);
        return json({ packs: data });
      }

      // Saves a pack. Unpublishing it also unpublishes every character and
      // wearable in it; `publishItems` publishes them all along with it.
      case "savePack": {
        const row = validatePack(body.pack);
        const { data, error } = await db.from("packs").upsert(row).select().single();
        fail(error);
        let changed = { characters: 0, wearables: 0 };
        const cascade = !row.published ? false : body.publishItems === true ? true : null;
        if (cascade !== null) {
          const [ch, we] = await Promise.all([
            db.from("characters").update({ published: cascade }).eq("pack", row.id).neq("published", cascade).select("id"),
            db.from("wearables").update({ published: cascade }).eq("pack", row.id).neq("published", cascade).select("id"),
          ]);
          fail(ch.error);
          fail(we.error);
          changed = { characters: ch.data?.length ?? 0, wearables: we.data?.length ?? 0 };
        }
        return json({ pack: data, changed });
      }

      case "deletePack": {
        const id = String(body.id ?? "");
        const [{ count: c1 }, { count: c2 }] = await Promise.all([
          db.from("characters").select("id", { count: "exact", head: true }).eq("pack", id),
          db.from("wearables").select("id", { count: "exact", head: true }).eq("pack", id),
        ]);
        if ((c1 ?? 0) + (c2 ?? 0) > 0) throw new HttpError(409, "Move or delete this pack’s characters and wearables first, or just unpublish it.");
        const { error } = await db.from("packs").delete().eq("id", id);
        fail(error);
        return json({ ok: true });
      }

      case "listContent": {
        const [d, s, h] = await Promise.all([
          db.from("drops").select("*").order("sort_order"),
          db.from("home_slides").select("*").order("sort_order"),
          db.from("site_settings").select("value").eq("key", "home").maybeSingle(),
        ]);
        fail(d.error);
        fail(s.error);
        fail(h.error);
        return json({ drops: d.data, slides: s.data, settings: h.data?.value ?? null });
      }

      case "saveDrop": {
        const { data: chars } = await db.from("characters").select("id");
        const row = validateDrop(body.drop, (chars ?? []).map((c) => c.id));
        // Scheduling (live + a start date) needs every character in the
        // capsule minted on this network, so their sales can open with it.
        if (row.live && row.starts_at) {
          const network = String(body.network ?? "");
          if (!allowedNetworks().includes(network as Network)) throw new HttpError(400, "Pick the network the drop is scheduled on.");
          const { data: crew } = await db.from("characters").select("id, name, nft").in("id", row.character_ids);
          const unminted = (crew ?? []).filter((c) => c.nft?.[network]?.status !== "minted");
          if (!row.character_ids.length) throw new HttpError(400, "Add the characters before scheduling the drop.");
          if (unminted.length) {
            throw new HttpError(
              400,
              "Mint every character in the drop before scheduling it.",
              unminted.map((c) => `${c.name}: not minted on ${network} yet`),
            );
          }
        }
        const { data, error } = await db.from("drops").upsert(row).select().single();
        fail(error);
        return json({ drop: data });
      }

      case "deleteDrop": {
        // Its hero slide goes with it (on delete cascade).
        const { error } = await db.from("drops").delete().eq("id", String(body.id ?? ""));
        fail(error);
        return json({ ok: true });
      }

      case "saveSlide": {
        const { data: drops } = await db.from("drops").select("id");
        const row = validateSlide(body.slide, (drops ?? []).map((d) => d.id));
        const { data, error } = await db.from("home_slides").upsert(row).select().single();
        fail(error);
        return json({ slide: data });
      }

      case "deleteSlide": {
        const { error } = await db.from("home_slides").delete().eq("id", String(body.id ?? ""));
        fail(error);
        return json({ ok: true });
      }

      case "orderSlides": {
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        for (const [i, id] of ids.entries()) {
          const { error } = await db.from("home_slides").update({ sort_order: i }).eq("id", id);
          fail(error);
        }
        return json({ ok: true });
      }

      case "saveHomeSettings": {
        const { data: chars } = await db.from("characters").select("id, pack");
        const ids = (chars ?? []).map((c) => c.id);
        const packIds = [...new Set((chars ?? []).map((c) => c.pack).filter(Boolean))];
        const value = validateHomeSettings(body.settings, ids, packIds);
        const { error } = await db.from("site_settings").upsert({ key: "home", value });
        fail(error);
        return json({ settings: value });
      }

      case "upload": {
        const folder = String(body.folder ?? "");
        if (!/^(wearables|characters|drops|slides|packs)\/[a-z0-9-]{2,48}$/.test(folder)) throw new HttpError(400, "Bad upload folder.");
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
