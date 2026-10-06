// NFT ownership: read from Solana, cached in public.nfts / public.nft_ownership.
//
//   getCurrentOwner(network, assetAddress)   chain read, no writes
//   verifyOwnership(nft)                     chain vs. database, no writes
//   syncOwnership(db, nft)                   chain read → database
//   syncAllOwnership(db, network)            discover new copies + sync every NFT
//   recordObservations(db, network, seen)    save owners already read from the chain
//
// The chain is the source of truth. An owner is only ever written right after
// reading the asset account; nothing a client sends, no listing and no admin
// choice becomes an owner. When the chain can't be read the NFT is marked
// "unverified" and its last known owner is left alone.
//
// Triggers today: verified purchases (purchase-verify), wallet inventory
// reads (inventory), and the admin's "Sync ownership" / "Sync all". A cron or
// webhook can call syncAllOwnership the same way later.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { HttpError } from "../http.ts";
import { CHAIN, type Network } from "./config.ts";
import { assetsInCollection, firstSignature, readAssetState, readAssetStates, type AssetState } from "./chain.ts";
import { collectionIndex, type IndexedAsset } from "./index.ts";

export type NftRow = {
  id: string;
  asset_kind: "character" | "wearable";
  asset_id: string;
  chain: string;
  network: Network;
  asset_address: string;
  collection_address: string;
  name: string | null;
  status: "unknown" | "unverified" | "owned" | "burned";
  last_verified_at: string | null;
};

export type SyncResult = {
  nftId: string;
  assetId: string;
  assetAddress: string;
  status: NftRow["status"];
  changed: boolean;
  previous: string | null;
  current: string | null;
  error?: string;
};

// Columns plus the current ownership period, as the admin API reads them.
export const NFT_SELECT =
  "*, nft_ownership(owner_wallet, first_seen_at, last_verified_at, acquired_at, acquisition_source, acquisition_signature, is_current, ended_at, ended_reason)";

// RPC errors can carry the RPC URL (and with it an API key); store a plain reason.
function reason(error: unknown) {
  if (error instanceof HttpError) return error.message;
  return "Couldn’t reach the Solana RPC.";
}

const fail = (error: { message: string } | null) => {
  if (error) throw new HttpError(500, error.message);
};

// --- reads ------------------------------------------------------------------

export function getCurrentOwner(network: Network, assetAddress: string): Promise<AssetState> {
  return readAssetState(network, assetAddress);
}

// Compares the chain with what the database holds; writes nothing.
export async function verifyOwnership(db: SupabaseClient, nft: NftRow) {
  const { data } = await db.from("nft_ownership").select("owner_wallet").eq("nft_id", nft.id).eq("is_current", true).maybeSingle();
  const recorded = data?.owner_wallet ?? null;
  const live = await getCurrentOwner(nft.network, nft.asset_address);
  const onChain = live.state === "live" && live.collection === nft.collection_address ? live.owner : null;
  return { recorded, onChain, state: live.state, matches: recorded === onChain };
}

// --- writes -----------------------------------------------------------------

async function markUnverified(db: SupabaseClient, nft: NftRow, error: string) {
  // A burned NFT stays burned; anything else keeps its owner but is flagged.
  await db
    .from("nfts")
    .update({ status: nft.status === "burned" ? "burned" : "unverified", last_checked_at: new Date().toISOString(), verify_error: error })
    .eq("id", nft.id);
}

// Applies one chain read to one NFT.
async function apply(db: SupabaseClient, nft: NftRow, live: AssetState, checkedAt: string): Promise<SyncResult> {
  const base = { nftId: nft.id, assetId: nft.asset_id, assetAddress: nft.asset_address };

  if (live.state === "burned") {
    const { data, error } = await db.rpc("nft_record_burned", { p_nft: nft.id, p_verified_at: checkedAt });
    fail(error);
    return { ...base, status: "burned", changed: data.changed, previous: data.previous, current: null };
  }

  if (live.state === "foreign" || live.collection !== nft.collection_address) {
    const error = live.state === "foreign" ? "The address isn’t a Metaplex Core asset." : "The asset is no longer in its Fuchey collection.";
    await markUnverified(db, nft, error);
    return { ...base, status: nft.status === "burned" ? "burned" : "unverified", changed: false, previous: null, current: null, error };
  }

  // Fill in name / uri from the account the first time we read it.
  if (!nft.name) await db.from("nfts").update({ name: live.name, metadata_uri: live.uri }).eq("id", nft.id).is("name", null);

  const { data, error } = await db.rpc("nft_record_owner", { p_nft: nft.id, p_owner: live.owner, p_verified_at: checkedAt });
  fail(error);
  return { ...base, status: "owned", changed: data.changed, previous: data.previous, current: data.current };
}

export async function syncOwnership(db: SupabaseClient, nft: NftRow): Promise<SyncResult> {
  const checkedAt = new Date().toISOString();
  let live: AssetState;
  try {
    live = await getCurrentOwner(nft.network, nft.asset_address);
  } catch (e) {
    const error = reason(e);
    await markUnverified(db, nft, error);
    return {
      nftId: nft.id,
      assetId: nft.asset_id,
      assetAddress: nft.asset_address,
      status: nft.status === "burned" ? "burned" : "unverified",
      changed: false,
      previous: null,
      current: null,
      error,
    };
  }
  return apply(db, nft, live, checkedAt);
}

// Registers an NFT we haven't seen. `mint` is looked up on-chain when not given.
export async function registerNft(
  db: SupabaseClient,
  network: Network,
  item: IndexedAsset,
  asset: { address: string; name?: string | null; uri?: string | null },
  mint?: { signature: string; at: string | null } | null,
) {
  const found = mint === undefined ? await firstSignature(network, asset.address).catch(() => null) : mint;
  const uri = asset.uri ?? item.metadataUrl;
  const { data, error } = await db.rpc("nft_register", {
    p: {
      asset_kind: item.kind,
      asset_id: item.id,
      chain: CHAIN,
      network,
      asset_address: asset.address,
      collection_address: item.collection,
      name: asset.name ?? null,
      metadata_uri: uri,
      // Every copy carries the product's metadata URI; the JSON is the one we uploaded there.
      metadata_json: uri && uri === item.metadataUrl ? item.metadata : null,
      mint_signature: found?.signature ?? null,
      minted_at: found?.at ?? null,
    },
  });
  fail(error);
  return data as string;
}

// Saves owners just read from the chain (e.g. a wallet's assets), registering
// NFTs we hadn't seen. Unchanged owners are refreshed in two bulk updates.
export async function recordObservations(
  db: SupabaseClient,
  network: Network,
  seen: { address: string; owner: string; item: IndexedAsset }[],
  checkedAt: string,
  { lookupMint = false } = {},
): Promise<SyncResult[]> {
  if (!seen.length) return [];
  const { data: rows, error } = await db
    .from("nfts")
    .select("id, asset_id, asset_address, status, nft_ownership(id, owner_wallet, is_current)")
    .eq("chain", CHAIN)
    .eq("network", network)
    .in("asset_address", seen.map((s) => s.address));
  fail(error);
  const byAddress = new Map((rows ?? []).map((r) => [r.asset_address as string, r]));

  const results: SyncResult[] = [];
  const unchangedOwnership: number[] = [];
  const unchangedNfts: string[] = [];
  for (const s of seen) {
    const row = byAddress.get(s.address);
    const current = (row?.nft_ownership as { id: number; owner_wallet: string; is_current: boolean }[] | undefined)?.find((o) => o.is_current);
    if (row && current?.owner_wallet === s.owner && row.status !== "burned") {
      unchangedOwnership.push(current.id);
      unchangedNfts.push(row.id);
      results.push({ nftId: row.id, assetId: s.item.id, assetAddress: s.address, status: "owned", changed: false, previous: s.owner, current: s.owner });
      continue;
    }
    const nftId = row?.id ?? (await registerNft(db, network, s.item, { address: s.address }, lookupMint ? undefined : null));
    const { data, error: e } = await db.rpc("nft_record_owner", { p_nft: nftId, p_owner: s.owner, p_verified_at: checkedAt });
    fail(e);
    results.push({ nftId, assetId: s.item.id, assetAddress: s.address, status: "owned", changed: data.changed, previous: data.previous, current: data.current });
  }

  if (unchangedOwnership.length) {
    const [a, b] = await Promise.all([
      db.from("nft_ownership").update({ last_verified_at: checkedAt }).in("id", unchangedOwnership).lt("last_verified_at", checkedAt),
      db
        .from("nfts")
        .update({ status: "owned", last_verified_at: checkedAt, last_checked_at: checkedAt, verify_error: null })
        .in("id", unchangedNfts),
    ]);
    fail(a.error);
    fail(b.error);
  }
  return results;
}

// Every NFT on a network, against the chain:
//   1. discover copies in each deployed Fuchey collection and register new ones
//   2. read every registered NFT's account (batched) and record its owner
// A failed read marks NFTs unverified; it never removes or reassigns an owner.
export async function syncAllOwnership(db: SupabaseClient, network: Network) {
  const startedAt = new Date().toISOString();
  const index = await collectionIndex(db, network);
  const errors: string[] = [];

  // 1. discovery
  let discovered = 0;
  const { data: known, error } = await db.from("nfts").select("asset_address").eq("chain", CHAIN).eq("network", network);
  fail(error);
  const knownSet = new Set((known ?? []).map((r) => r.asset_address as string));
  for (const item of index.values()) {
    try {
      for (const a of await assetsInCollection(network, item.collection)) {
        if (knownSet.has(a.address)) continue;
        await registerNft(db, network, item, { address: a.address });
        knownSet.add(a.address);
        discovered++;
      }
    } catch (e) {
      errors.push(`${item.id}: couldn’t list its collection (${reason(e)})`);
    }
  }

  // 2. verification
  const { data: nfts, error: e2 } = await db.from("nfts").select("*").eq("chain", CHAIN).eq("network", network);
  fail(e2);
  const all = (nfts ?? []) as NftRow[];
  const checkedAt = new Date().toISOString();
  let states: Map<string, AssetState> | null = null;
  try {
    states = await readAssetStates(network, all.map((n) => n.asset_address));
  } catch (e) {
    errors.push(`couldn’t read the assets (${reason(e)})`);
  }

  const results: SyncResult[] = [];
  for (const nft of all) {
    const live = states?.get(nft.asset_address);
    if (!live) {
      const error = errors.at(-1) ?? "Couldn’t read the asset.";
      await markUnverified(db, nft, error);
      results.push({ nftId: nft.id, assetId: nft.asset_id, assetAddress: nft.asset_address, status: "unverified", changed: false, previous: null, current: null, error });
      continue;
    }
    results.push(await apply(db, nft, live, checkedAt));
  }

  return {
    network,
    startedAt,
    finishedAt: new Date().toISOString(),
    checked: results.length,
    discovered,
    owned: results.filter((r) => r.status === "owned").length,
    unverified: results.filter((r) => r.status === "unverified").length,
    burned: results.filter((r) => r.status === "burned").length,
    changes: results.filter((r) => r.changed),
    errors,
  };
}
