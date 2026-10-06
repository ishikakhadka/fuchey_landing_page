// What a wallet owns in Fuchey, read from the chain — the endpoint for the
// marketplace's "My Collection" and for the Fuchey app / extension.
//
// POST { wallet, network }
//   → {
//       wallet, network, chain, syncedAt,
//       assets:     [{ assetId, type, nftAssetAddress, ownerWallet, name }],
//       characters: [{ assetId, asset, name }],
//       wearables:  [{ assetId, asset, name, type, compatibleCharacters }],
//       loadouts:   { [characterId]: { slots, equipped: [wearableId] } }
//     }
//
// Resolution: wallet → Core assets (Helius DAS, or a program scan) → only
// those in a deployed Fuchey collection → asset ids → characters / wearables.
// `equipped` is the saved look filtered to wearables the wallet actually
// owns and that fit the character — ownership and compatibility stay two
// separate checks that only meet here.
//
// The NFT registry (nfts / nft_ownership) is refreshed as a cache, keeping
// history: NFTs the database still credits to this wallet but the chain
// doesn't list are re-read, so a transfer made outside the marketplace is
// recorded against its new owner. The chain stays the source of truth. Works
// for any wallet app — only the address matters.

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { allowedNetworks, CHAIN, type Network } from "../_shared/nft/config.ts";
import { assetsOwnedBy } from "../_shared/nft/chain.ts";
import { collectionIndex, isAddress } from "../_shared/nft/index.ts";
import { type NftRow, recordObservations, syncOwnership } from "../_shared/nft/ownership.ts";

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

    // Refresh the registry for this wallet.
    const syncedAt = new Date().toISOString();
    await recordObservations(db, network, mine.map(({ asset, item }) => ({ address: asset, owner: wallet, item })), syncedAt);

    // NFTs we still credit to this wallet that the chain no longer lists:
    // read each one to find where it went.
    const held = new Set(mine.map((m) => m.asset));
    const { data: credited } = await db
      .from("nft_ownership")
      .select("nfts!inner(*)")
      .eq("owner_wallet", wallet)
      .eq("is_current", true)
      .eq("nfts.chain", CHAIN)
      .eq("nfts.network", network);
    for (const { nfts: nft } of (credited ?? []) as unknown as { nfts: NftRow }[]) {
      if (!held.has(nft.asset_address)) await syncOwnership(db, nft);
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

    // Flat list for the companion app: wallet → NFT asset → Fuchey asset id.
    const assets = mine.map((m) => ({
      assetId: m.item.id,
      type: m.item.kind,
      nftAssetAddress: m.asset,
      ownerWallet: wallet,
      name: m.item.name,
    }));

    return json({ wallet, network, chain: CHAIN, syncedAt, assets, characters, wearables, loadouts });
  }),
);
