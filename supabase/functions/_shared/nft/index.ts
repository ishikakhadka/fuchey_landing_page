// Collection address → Fuchey asset, for one network. This is the bridge from
// "an NFT in a wallet" to "a Yeti" / "Pixel Glasses": only assets in a
// collection that a Fuchey deployment created count — names and images are
// never trusted.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { AssetKind, Network } from "./config.ts";

export type IndexedAsset = {
  kind: AssetKind;
  id: string; // Fuchey asset id
  name: string;
  collection: string;
  candyMachine: string | null;
  metadataUrl: string | null; // the uri every copy carries on-chain
  metadata: unknown; // the JSON uploaded to metadataUrl
};

type NftEntry = { status?: string; collection?: string; candyMachine?: string; metadataUrl?: string; metadata?: unknown };

export async function collectionIndex(db: SupabaseClient, network: Network) {
  const [c, w] = await Promise.all([
    db.from("characters").select("id, name, nft"),
    db.from("wearables").select("id, name, nft"),
  ]);
  const index = new Map<string, IndexedAsset>();
  const add = (kind: AssetKind, rows: { id: string; name: string; nft: Record<string, NftEntry> }[] | null) => {
    for (const r of rows ?? []) {
      const e = r.nft?.[network];
      if (e?.status === "minted" && e.collection) {
        index.set(e.collection, {
          kind,
          id: r.id,
          name: r.name,
          collection: e.collection,
          candyMachine: e.candyMachine ?? null,
          metadataUrl: e.metadataUrl ?? null,
          metadata: e.metadata ?? null,
        });
      }
    }
  };
  add("character", c.data);
  add("wearable", w.data);
  return index;
}

export const isAddress = (s: unknown): s is string => typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
