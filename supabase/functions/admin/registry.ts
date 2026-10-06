// NFT registry actions for the admin function: every minted copy, who holds
// it, and re-checking that against the chain.
//
//   nftList     { network }  → { network, nfts: [summary] }
//   nftDetail   { id }       → { nft: detail }   (+ ownership history, metadata, listing)
//   nftSync     { id }       → { result, nft }   read this NFT's owner from the chain
//   nftSyncAll  { network }  → { summary, nfts } discover new copies + re-check all
//
// Admins can trigger a sync; they can't choose an owner. Owners only come
// from chain reads (functions/_shared/nft/ownership.ts).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { HttpError } from "../_shared/http.ts";
import { allowedNetworks, type Network } from "../_shared/nft/config.ts";
import { NFT_SELECT, type NftRow, syncAllOwnership, syncOwnership } from "../_shared/nft/ownership.ts";

type Period = {
  owner_wallet: string;
  first_seen_at: string;
  last_verified_at: string;
  acquired_at: string | null;
  acquisition_source: string;
  acquisition_signature: string | null;
  is_current: boolean;
  ended_at: string | null;
  ended_reason: string | null;
};
type Row = NftRow & Record<string, any> & { nft_ownership: Period[] };

const period = (p: Period) => ({
  wallet: p.owner_wallet,
  firstSeenAt: p.first_seen_at,
  lastVerifiedAt: p.last_verified_at,
  acquiredAt: p.acquired_at,
  source: p.acquisition_source,
  signature: p.acquisition_signature,
  endedAt: p.ended_at,
  endedReason: p.ended_reason,
});

async function catalogNames(db: SupabaseClient) {
  const [c, w] = await Promise.all([
    db.from("characters").select("id, name, image_url"),
    db.from("wearables").select("id, name, image_url"),
  ]);
  const names = new Map<string, { name: string; image: string | null }>();
  for (const r of c.data ?? []) names.set(`character:${r.id}`, { name: r.name, image: r.image_url });
  for (const r of w.data ?? []) names.set(`wearable:${r.id}`, { name: r.name, image: r.image_url });
  return names;
}

function summary(row: Row, names: Map<string, { name: string; image: string | null }>) {
  const current = row.nft_ownership?.find((p) => p.is_current);
  const asset = names.get(`${row.asset_kind}:${row.asset_id}`);
  return {
    id: row.id,
    assetKind: row.asset_kind,
    assetId: row.asset_id,
    assetName: asset?.name ?? row.asset_id,
    image: asset?.image ?? null,
    chain: row.chain,
    network: row.network,
    assetAddress: row.asset_address,
    collectionAddress: row.collection_address,
    name: row.name,
    metadataUri: row.metadata_uri,
    status: row.status,
    mintSignature: row.mint_signature,
    mintedAt: row.minted_at,
    lastVerifiedAt: row.last_verified_at,
    lastCheckedAt: row.last_checked_at,
    verifyError: row.verify_error,
    owner: current ? period(current) : null,
  };
}

function networkOf(body: Record<string, unknown>) {
  const network = body.network as Network;
  if (!allowedNetworks().includes(network)) throw new HttpError(400, `Unsupported network ${network}.`);
  return network;
}

async function list(db: SupabaseClient, network: Network) {
  const [{ data, error }, names] = await Promise.all([
    db.from("nfts").select(NFT_SELECT).eq("network", network).order("minted_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    catalogNames(db),
  ]);
  if (error) throw new HttpError(500, error.message);
  return ((data ?? []) as Row[]).map((r) => summary(r, names));
}

async function detail(db: SupabaseClient, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, "Bad NFT id.");
  const [{ data: row }, names] = await Promise.all([db.from("nfts").select(NFT_SELECT).eq("id", id).maybeSingle(), catalogNames(db)]);
  if (!row) throw new HttpError(404, "NFT not found.");
  const r = row as Row;
  const { data: listing } = await db
    .from("listings")
    .select("status, price, currency, seller_wallet, candy_machine")
    .match({ asset_kind: r.asset_kind, asset_id: r.asset_id, network: r.network })
    .maybeSingle();
  const history = [...(r.nft_ownership ?? [])].sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at)).map(period);
  return { ...summary(r, names), metadataJson: r.metadata_json, history, listing };
}

export const REGISTRY_ACTIONS = ["nftList", "nftDetail", "nftSync", "nftSyncAll"];

export async function registryAction(action: string, body: Record<string, unknown>, db: SupabaseClient) {
  switch (action) {
    case "nftList": {
      const network = networkOf(body);
      return { network, nfts: await list(db, network) };
    }

    case "nftDetail":
      return { nft: await detail(db, String(body.id ?? "")) };

    case "nftSync": {
      const id = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, "Bad NFT id.");
      const { data: row } = await db.from("nfts").select("*").eq("id", id).maybeSingle();
      if (!row) throw new HttpError(404, "NFT not found.");
      const result = await syncOwnership(db, row as NftRow);
      return { result, nft: await detail(db, id) };
    }

    case "nftSyncAll": {
      const network = networkOf(body);
      const result = await syncAllOwnership(db, network);
      return { summary: result, nfts: await list(db, network) };
    }

    default:
      throw new HttpError(400, "Unknown NFT registry action.");
  }
}
