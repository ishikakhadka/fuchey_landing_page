// Verifies a marketplace purchase after the buyer's wallet has sent it.
//
// POST { network, signature, asset, wallet }
//   → { verified: true, kind, assetId, asset, wallet }
//
// Everything is checked against the chain, not the request: the transaction
// must be confirmed and successful, signed by `wallet`, involve `asset`; the
// asset must exist, be owned by `wallet`, and sit in a Fuchey collection.
// Only then is it recorded (purchases + ownership index). Calling it twice is
// harmless; it never changes on-chain state.

import { handler, HttpError, json, serviceClient } from "../_shared/http.ts";
import { allowedNetworks, CHAIN, type Network } from "../_shared/nft/config.ts";
import { checkPurchaseTx, readAsset } from "../_shared/nft/chain.ts";
import { collectionIndex, isAddress } from "../_shared/nft/index.ts";

Deno.serve(
  handler(async (req) => {
    const body = await req.json().catch(() => ({}));
    const network = body.network as Network;
    if (!allowedNetworks().includes(network)) throw new HttpError(400, "Unsupported network.");
    if (typeof body.signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(body.signature)) {
      throw new HttpError(400, "Missing transaction signature.");
    }
    if (!isAddress(body.asset) || !isAddress(body.wallet)) throw new HttpError(400, "Missing asset or wallet address.");

    const tx = await checkPurchaseTx(network, body.signature, body.wallet, body.asset);
    if (!tx.ok) throw new HttpError(409, `Purchase not verified: ${tx.reason}.`);

    const asset = await readAsset(network, body.asset);
    if (!asset) throw new HttpError(409, "Purchase not verified: the asset doesn’t exist on-chain.");
    if (asset.owner !== body.wallet) throw new HttpError(409, "Purchase not verified: the wallet doesn’t own that asset.");

    const db = serviceClient();
    const item = asset.collection ? (await collectionIndex(db, network)).get(asset.collection) : undefined;
    if (!item) throw new HttpError(409, "Purchase not verified: that asset isn’t from a Fuchey collection.");

    const { data: listing } = await db
      .from("listings")
      .select("price")
      .match({ asset_kind: item.kind, asset_id: item.id, network })
      .maybeSingle();

    await db.from("purchases").upsert({
      signature: body.signature,
      network,
      chain: CHAIN,
      wallet: body.wallet,
      asset_kind: item.kind,
      asset_id: item.id,
      asset_address: body.asset,
      price: listing?.price ?? null,
    });
    await db.from("ownership").upsert({
      network,
      asset_address: body.asset,
      chain: CHAIN,
      wallet: body.wallet,
      asset_kind: item.kind,
      asset_id: item.id,
      collection: item.collection,
      last_synced_at: new Date().toISOString(),
    });

    return json({ verified: true, kind: item.kind, assetId: item.id, asset: body.asset, wallet: body.wallet });
  }),
);
