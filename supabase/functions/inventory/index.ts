// What a wallet owns in Fuchey, read from the chain — the endpoint for the
// marketplace's "My Collection" and for the Fuchey app / extension.
//
// POST { wallet, network }
//   → {
//       wallet, network, chain, syncedAt,
//       characters: [{ assetId, asset, name }],
//       wearables:  [{ assetId, asset, name, type, compatibleCharacters }],
//       loadouts:   { [characterId]: { slots, equipped: [wearableId] } }
//     }
//
// Resolution: wallet → Core assets (Helius DAS, or a program scan) → only
// those in a deployed Fuchey collection → asset ids → characters / wearables.
// `equipped` is the saved look filtered to wearables the wallet actually
// owns and that fit the character. The ownership table is refreshed as a
// cache; the chain stays the source of truth. Works for any wallet app —
// only the address matters.

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { allowedNetworks, CHAIN, type Network } from "../_shared/nft/config.ts";
import { assetsOwnedBy } from "../_shared/nft/chain.ts";
import { collectionIndex, isAddress } from "../_shared/nft/index.ts";

Deno.serve(
  handler(async (req) => {
    const body = await req.json().catch(() => ({}));
    const network = (body.network ?? "devnet") as Network;
    if (!allowedNetworks().includes(network)) throw new HttpError(400, "Unsupported network.");
    if (!isAddress(body.wallet)) throw new HttpError(400, "Missing wallet address.");
    const wallet = body.wallet as string;

    const db = serviceClient();
    const [index, owned] = await Promise.all([collectionIndex(db, network), assetsOwnedBy(network, wallet)]);
    const mine = owned
      .map((a) => ({ asset: a.address, item: a.collection ? index.get(a.collection) : undefined }))
      .filter((a): a is { asset: string; item: NonNullable<typeof a.item> } => Boolean(a.item));

    // Refresh the cache for this wallet.
    const syncedAt = new Date().toISOString();
    await db.from("ownership").delete().match({ network, wallet });
    if (mine.length) {
      await db.from("ownership").upsert(
        mine.map(({ asset, item }) => ({
          network,
          asset_address: asset,
          chain: CHAIN,
          wallet,
          asset_kind: item.kind,
          asset_id: item.id,
          collection: item.collection,
          last_synced_at: syncedAt,
        })),
      );
    }

    const wearableIds = [...new Set(mine.filter((m) => m.item.kind === "wearable").map((m) => m.item.id))];
    const { data: wearableRows } = wearableIds.length
      ? await db.from("wearables").select("id, type, compatible_characters").in("id", wearableIds)
      : { data: [] };
    const wearableInfo = new Map((wearableRows ?? []).map((w) => [w.id, w]));

    const characters = mine
      .filter((m) => m.item.kind === "character")
      .map((m) => ({ assetId: m.item.id, asset: m.asset, name: m.item.name }));
    const wearables = mine
      .filter((m) => m.item.kind === "wearable")
      .map((m) => ({
        assetId: m.item.id,
        asset: m.asset,
        name: m.item.name,
        type: wearableInfo.get(m.item.id)?.type ?? null,
        compatibleCharacters: wearableInfo.get(m.item.id)?.compatible_characters ?? [],
      }));

    // Saved looks, limited to what this wallet owns and what fits.
    const characterIds = [...new Set(characters.map((c) => c.assetId))];
    const { data: looks } = characterIds.length
      ? await db.from("loadouts").select("character_id, slots").eq("wallet", wallet).in("character_id", characterIds)
      : { data: [] };
    const loadouts: Record<string, { slots: Record<string, string>; equipped: string[] }> = {};
    for (const look of looks ?? []) {
      const equipped = Object.entries(look.slots as Record<string, string>)
        .filter(([slot, id]) => {
          const w = wearableInfo.get(id);
          return w && w.type === slot && w.compatible_characters.includes(look.character_id);
        })
        .map(([, id]) => id);
      loadouts[look.character_id] = { slots: look.slots, equipped };
    }

    return json({ wallet, network, chain: CHAIN, syncedAt, characters, wearables, loadouts });
  }),
);
