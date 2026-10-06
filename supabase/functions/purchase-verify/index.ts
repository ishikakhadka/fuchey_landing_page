// Verifies a marketplace purchase after the buyer's wallet has sent it.
//
// POST { network, signature, asset, wallet }
//   → { verified: true, kind, assetId, asset, wallet, nftId }
//
// Everything is checked against the chain, not the request: the transaction
// must be confirmed and successful, signed by `wallet`, and a mint from the
// product's candy machine that created `asset`; the asset must exist, be
// owned by `wallet`, and sit in that product's Fuchey collection. Only then
// is it recorded — purchase, NFT and first owner in one transaction (SQL
// nft_record_purchase). The owner written is the one read from the asset
// account, never the request's. Calling it twice is harmless; it never
// changes on-chain state.

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

    const asset = await readAsset(network, body.asset);
    // "not found" — the client retries it while our RPC catches up.
    if (!asset) throw new HttpError(409, "Purchase not verified: the asset was not found on-chain (yet).");
    if (asset.owner !== body.wallet) throw new HttpError(409, "Purchase not verified: the wallet doesn’t own that asset.");

    const db = serviceClient();
    const item = asset.collection ? (await collectionIndex(db, network)).get(asset.collection) : undefined;
    if (!item) throw new HttpError(409, "Purchase not verified: that asset isn’t from a Fuchey collection.");

    const tx = await checkPurchaseTx(network, body.signature, body.wallet, body.asset, item.candyMachine ? [item.candyMachine] : []);
    if (!tx.ok) throw new HttpError(409, `Purchase not verified: ${tx.reason}.`);

    const { data: listing } = await db
      .from("listings")
      .select("price")
      .match({ asset_kind: item.kind, asset_id: item.id, network })
      .maybeSingle();

    const { data, error } = await db.rpc("nft_record_purchase", {
      p_purchase: {
        signature: body.signature,
        network,
        chain: CHAIN,
        wallet: body.wallet,
        asset_kind: item.kind,
        asset_id: item.id,
        asset_address: body.asset,
        price: listing?.price ?? null,
      },
      p_nft: {
        asset_kind: item.kind,
        asset_id: item.id,
        chain: CHAIN,
        network,
        asset_address: body.asset,
        collection_address: item.collection,
        name: asset.name,
        metadata_uri: asset.uri,
        metadata_json: asset.uri === item.metadataUrl ? item.metadata : null,
        mint_signature: body.signature,
        minted_at: tx.blockTime,
      },
      p_owner: asset.owner,
      p_verified_at: new Date().toISOString(),
    });
    if (error) throw new HttpError(500, error.message);

    return json({ verified: true, kind: item.kind, assetId: item.id, asset: body.asset, wallet: asset.owner, nftId: data.nft_id });
  }),
);
