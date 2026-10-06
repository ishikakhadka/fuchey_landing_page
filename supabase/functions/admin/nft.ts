// NFT lifecycle actions for the admin function.
//
//   nftStatus        current state + live on-chain sale numbers + what blocks minting
//   previewMetadata  the metadata JSON as it would be generated (nothing uploaded)
//   generateMetadata upload artwork + metadata to IPFS → status "metadata-created"
//   prepareMint      issue the deploy plan (what may be created) → "minting"
//   confirmMint      verify the deployment on-chain against the plan → "minted" (+ draft listing)
//   prepareSale      issue the plan for a listing change (price, limit, open/closed)
//   confirmSale      verify the candy guard on-chain against it → save the listing
//   prepareMetadataUpdate / confirmMetadataUpdate
//                    new artwork for a deployed item → collection, candy machine and
//                    every live copy pointed at it on-chain, then verified
//
// The admin's wallet builds and signs the transactions in the browser from the
// plan (src/services/nft/deploy.js); this server holds no keys and saves only
// what it has verified on-chain.
//
// Status per network: not-configured → ready → uploading → metadata-created →
// minting → minted, or failed (with `error`). Nothing is marked minted or
// listed until the chain says so.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { HttpError } from "../_shared/http.ts";
import { allowedNetworks, CHAIN, COLLECTION_GROUPS, configuredTreasury, STANDARD, type AssetKind, type Network } from "../_shared/nft/config.ts";
import { buildMetadata, mintProblems, nftName } from "../_shared/nft/metadata.ts";
import { nftStorage } from "../_shared/nft/storage.ts";
import { assetsInCollection, readAssetStates, readProductMetadata, readSale, verifyDeploy, type SaleState } from "../_shared/nft/chain.ts";

type SaleTerms = {
  price: number;
  treasury: string;
  limitPerWallet: number | null;
  state: SaleState;
  startsAt?: string | null;
  endsAt?: string | null;
};

type Row = Record<string, any> & { id: string; name: string };
type Entry = Record<string, any>;

const TABLE: Record<AssetKind, string> = { character: "characters", wearable: "wearables" };
const MAX_IMAGE = 10 * 1024 * 1024;

function args(body: Record<string, unknown>) {
  const kind = body.kind === "character" || body.kind === "wearable" ? (body.kind as AssetKind) : null;
  const network = body.network as Network;
  if (!kind) throw new HttpError(400, "kind must be character or wearable.");
  if (!allowedNetworks().includes(network)) {
    throw new HttpError(400, `NFT actions aren’t enabled on ${network}. Allowed: ${allowedNetworks().join(", ")}.`);
  }
  return { kind, network, id: String(body.id ?? "") };
}

async function load(db: SupabaseClient, kind: AssetKind, id: string) {
  const { data } = await db.from(TABLE[kind]).select("*").eq("id", id).maybeSingle();
  if (!data) throw new HttpError(404, "Asset not found — save it first.");
  return data as Row;
}

async function save(db: SupabaseClient, kind: AssetKind, row: Row, network: Network, entry: Entry) {
  const nft = { ...(row.nft ?? {}), [network]: { chain: CHAIN, standard: STANDARD, collectionGroup: COLLECTION_GROUPS[kind].id, ...entry } };
  const { error } = await db.from(TABLE[kind]).update({ nft }).eq("id", row.id);
  if (error) throw new HttpError(500, error.message);
  row.nft = nft;
  return nft[network];
}

const entryOf = (row: Row, network: Network): Entry => row.nft?.[network] ?? {};

function statusOf(kind: AssetKind, row: Row, network: Network) {
  const e = entryOf(row, network);
  if (e.status) return e.status;
  return mintProblems(kind, row).length ? "not-configured" : "ready";
}

async function listingOf(db: SupabaseClient, kind: AssetKind, id: string, network: Network) {
  const { data } = await db.from("listings").select("*").match({ asset_kind: kind, asset_id: id, network }).maybeSingle();
  return data;
}

// Our own storage URLs are public addresses; locally (Docker) the function
// can't reach the public one, so fetch through the internal API URL instead.
function internalUrl(url: string) {
  const pub = Deno.env.get("PUBLIC_SUPABASE_URL")?.replace(/\/$/, "");
  const internal = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  return pub && internal && url.startsWith(pub) ? internal + url.slice(pub.length) : url;
}

// Artwork + metadata JSON to IPFS, built from the saved asset.
async function uploadArtwork(kind: AssetKind, row: Row) {
  const storage = nftStorage();
  const res = await fetch(internalUrl(row.image_url)).catch((e) => {
    throw new HttpError(502, `Couldn’t download the artwork: ${(e as Error).message}`);
  });
  if (!res.ok) throw new HttpError(400, `Couldn’t read the artwork (${res.status}).`);
  const type = res.headers.get("content-type") ?? "image/png";
  if (!/^image\/(png|webp|gif|jpeg)/.test(type)) throw new HttpError(400, "Artwork must be a PNG, WebP, GIF or JPEG.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE) throw new HttpError(400, "Artwork must be under 10 MB.");

  const image = await storage.putFile(bytes, `${kind}-${row.id}.${type.split("/")[1]}`, type);
  const metadata = buildMetadata(kind, row, image);
  const meta = await storage.putJson(metadata, `${kind}-${row.id}.json`);
  return { image, metadata, meta, provider: storage.provider };
}

function treasuryFor(network: Network, admin: string) {
  const t = configuredTreasury(network);
  if (t) return t;
  if (network === "mainnet-beta") throw new HttpError(400, "Set FUCHEY_TREASURY_MAINNET before deploying to mainnet.");
  return admin; // devnet: payments go to the deploying admin wallet
}

async function status(db: SupabaseClient, kind: AssetKind, row: Row, network: Network) {
  const entry = entryOf(row, network);
  const live =
    entry.status === "minted" && entry.candyGuard ? await readSale(network, entry.candyGuard, entry.candyMachine).catch(() => null) : null;
  return {
    network,
    status: statusOf(kind, row, network),
    nft: entry,
    listing: await listingOf(db, kind, row.id, network),
    live,
    problems: mintProblems(kind, row),
    storageConfigured: nftStorage().configured,
    collectionGroup: COLLECTION_GROUPS[kind],
  };
}

export async function nftAction(action: string, body: Record<string, unknown>, db: SupabaseClient, admin: string) {
  const { kind, network, id } = args(body);
  const row = await load(db, kind, id);
  const entry = entryOf(row, network);

  switch (action) {
    case "nftStatus":
      return status(db, kind, row, network);

    case "previewMetadata": {
      const placeholder = { uri: entry.imageUri ?? "ipfs://<artwork CID after upload>", url: entry.imageUrl ?? row.image_url ?? "" };
      return { metadata: buildMetadata(kind, row, placeholder), problems: mintProblems(kind, row) };
    }

    case "generateMetadata": {
      if (entry.status === "minted" || entry.status === "minting") {
        throw new HttpError(409, "This asset is already deployed on-chain; its metadata is fixed.");
      }
      const problems = mintProblems(kind, row);
      if (problems.length) throw new HttpError(400, "Fix these before generating metadata.", problems);
      const storage = nftStorage();
      if (!storage.configured) throw new HttpError(503, "NFT storage isn’t configured. Set the PINATA_JWT secret on the Supabase project.");

      await save(db, kind, row, network, { ...entry, status: "uploading", error: null });
      try {
        const { image, metadata, meta } = await uploadArtwork(kind, row);
        const saved = await save(db, kind, row, network, {
          status: "metadata-created",
          imageUri: image.uri,
          imageUrl: image.url,
          metadataUri: meta.uri,
          metadataUrl: meta.url,
          metadata,
          storage: storage.provider,
          generatedAt: new Date().toISOString(),
          error: null,
        });
        return { ...(await status(db, kind, row, network)), nft: saved };
      } catch (error) {
        await save(db, kind, row, network, { ...entry, status: "failed", error: (error as Error).message });
        throw error;
      }
    }

    case "prepareMint": {
      if (entry.status === "minted") throw new HttpError(409, "Already minted on this network.");
      if (!entry.metadataUri) throw new HttpError(400, "Generate the metadata first.");
      const problems = mintProblems(kind, row);
      if (problems.length) throw new HttpError(400, "Fix these before minting.", problems);

      const treasury = treasuryFor(network, admin);
      const plan = {
        network,
        authority: admin,
        title: nftName(kind, row),
        copyName: String(row.name),
        metadataUrl: entry.metadataUrl as string,
        supply: Number(row.supply),
        price: Number(row.price),
        treasury,
        limitPerWallet: (row.limit_per_wallet as number | null) ?? null,
      };
      await save(db, kind, row, network, {
        ...entry,
        status: "minting",
        error: null,
        pending: { ...plan, preparedAt: new Date().toISOString() },
      });
      return { plan };
    }

    case "confirmMint": {
      const p = entry.pending;
      if (entry.status !== "minting" || !p) throw new HttpError(409, "No mint in progress — prepare it again.");
      if (p.authority !== admin) throw new HttpError(403, "Confirm with the wallet that signed the mint.");
      const signatures = Array.isArray(body.signatures) ? body.signatures.map(String).slice(0, 10) : [];
      const collection = String(body.collection ?? "");
      const candyMachine = String(body.candyMachine ?? "");
      const check = await verifyDeploy(network, {
        admin,
        collection,
        candyMachine,
        title: p.title,
        metadataUrl: p.metadataUrl,
        supply: p.supply,
      });
      // The guard must enforce exactly the planned terms, closed until listed.
      if (check.ok && check.candyGuard) {
        const sale = await readSale(network, check.candyGuard, candyMachine);
        if (!sale) check.problems.push("candy guard not readable");
        else {
          if (Math.abs(sale.price - p.price) > 1e-9) check.problems.push("guard price differs from the plan");
          if (p.price > 0 && sale.treasury !== p.treasury) check.problems.push("guard pays a different treasury");
          if ((sale.limitPerWallet ?? null) !== (p.limitPerWallet ?? null)) check.problems.push("guard per-wallet limit differs");
          if (sale.open) check.problems.push("sale is open before being listed");
          if (sale.guards.some((g) => !["solPayment", "mintLimit", "startDate", "endDate"].includes(g)) || sale.groups) {
            check.problems.push("guard has unexpected rules");
          }
        }
        check.ok = check.problems.length === 0;
      }
      if (!check.ok) {
        // Accounts can lag a moment behind confirmation; let the client retry.
        if (body.final) {
          await save(db, kind, row, network, { ...entry, status: "failed", error: check.problems.join("; ") });
        }
        throw new HttpError(409, "The deployment isn’t visible on-chain as expected yet.", check.problems);
      }
      const { pending: _done, ...rest } = entry;
      const saved = await save(db, kind, row, network, {
        ...rest,
        status: "minted",
        collection,
        candyMachine,
        candyGuard: check.candyGuard,
        authority: p.authority,
        treasury: p.treasury,
        mintLimitId: p.limitPerWallet ? 1 : null,
        transactions: signatures.map((s: string) => ({ kind: "deploy", signature: s })),
        transactionSignature: signatures.at(-1) ?? null,
        deployedAt: new Date().toISOString(),
        error: null,
      });
      // A listing exists from here on, closed until the admin opens it.
      await db.from("listings").upsert({
        asset_kind: kind,
        asset_id: row.id,
        network,
        status: "draft",
        price: p.price,
        quantity: p.supply,
        limit_per_wallet: p.limitPerWallet,
        seller_wallet: p.treasury,
        candy_machine: candyMachine,
      });
      return { ...(await status(db, kind, row, network)), nft: saved };
    }

    case "prepareSale": {
      if (entry.status !== "minted") throw new HttpError(409, "Mint the NFT before listing it.");
      if (entry.authority !== admin) {
        throw new HttpError(403, `Only the wallet that deployed this item (${entry.authority}) can change its sale on-chain.`);
      }
      const state = String(body.state) as SaleState;
      if (!["draft", "active", "paused", "ended"].includes(state)) throw new HttpError(400, "Unknown listing state.");
      const listing = await listingOf(db, kind, row.id, network);
      const price = body.price == null || body.price === "" ? Number(listing?.price ?? row.price) : Number(body.price);
      if (!Number.isFinite(price) || price < 0) throw new HttpError(400, "price: must be 0 or more");
      const limitPerWallet =
        body.limitPerWallet === undefined ? (listing?.limit_per_wallet ?? row.limit_per_wallet ?? null) : body.limitPerWallet ? Number(body.limitPerWallet) : null;
      // The guard's mintLimit id is fixed at deploy; turning a limit on later is fine, the id stays 1.
      const terms: SaleTerms = {
        price,
        treasury: entry.treasury,
        limitPerWallet,
        state,
        startsAt: (body.startsAt as string) || null,
        endsAt: (body.endsAt as string) || null,
      };
      await save(db, kind, row, network, { ...entry, pendingSale: { ...terms, preparedAt: new Date().toISOString() } });
      return { plan: { ...terms, network, candyGuard: entry.candyGuard, candyMachine: entry.candyMachine } };
    }

    case "confirmSale": {
      const t = entry.pendingSale as SaleTerms | undefined;
      if (!t) throw new HttpError(409, "No listing change in progress.");
      const live = await readSale(network, entry.candyGuard, entry.candyMachine);
      const problems: string[] = [];
      if (!live) problems.push("candy guard not found");
      else {
        if (Math.abs(live.price - t.price) > 1e-9) problems.push("price on-chain differs");
        if (t.price > 0 && live.treasury !== t.treasury) problems.push("payment destination differs");
        if ((live.limitPerWallet ?? null) !== (t.limitPerWallet ?? null)) problems.push("per-wallet limit differs");
        const shouldOpen = t.state === "active";
        if (shouldOpen && live.startsAt == null) problems.push("sale isn’t open on-chain");
        if (!shouldOpen && live.open) problems.push("sale is still open on-chain");
        const unexpected = live.guards.filter((g) => !["solPayment", "mintLimit", "startDate", "endDate"].includes(g));
        if (unexpected.length || live.groups) problems.push(`unexpected guards on-chain: ${unexpected.join(", ") || "groups"}`);
      }
      if (problems.length) throw new HttpError(409, "The listing change isn’t visible on-chain as expected yet.", problems);

      const signature = typeof body.signature === "string" ? body.signature : null;
      const { pendingSale: _done, ...rest } = entry;
      await save(db, kind, row, network, {
        ...rest,
        transactions: [...(rest.transactions ?? []), ...(signature ? [{ kind: `sale:${t.state}`, signature }] : [])],
      });
      await db.from("listings").upsert({
        asset_kind: kind,
        asset_id: row.id,
        network,
        status: t.state,
        price: t.price,
        quantity: live!.supply,
        limit_per_wallet: t.limitPerWallet,
        seller_wallet: entry.treasury,
        candy_machine: entry.candyMachine,
        starts_at: live!.startsAt,
        ends_at: live!.endsAt,
        last_signature: signature,
      });
      // Keep the catalogue price in step with the sale (what's on sale is read
      // from `listings`, not from the catalogue's status column).
      await db.from(TABLE[kind]).update({ price: t.price }).eq("id", row.id);
      return status(db, kind, await load(db, kind, row.id), network);
    }

    // Changing the art of a deployed product: new artwork + metadata go to
    // IPFS, then the admin's wallet points the collection, the candy machine
    // (future copies) and every live copy at it. Saved only once the chain
    // shows all of them on the new URI.
    case "prepareMetadataUpdate": {
      if (entry.status !== "minted") throw new HttpError(409, "Only deployed items can have their on-chain artwork updated.");
      if (entry.authority !== admin) {
        throw new HttpError(403, `Only the wallet that deployed this item (${entry.authority}) can update it on-chain.`);
      }
      const problems = mintProblems(kind, row);
      if (problems.length) throw new HttpError(400, "Fix these before updating the artwork.", problems);
      if (!nftStorage().configured) throw new HttpError(503, "NFT storage isn’t configured. Set the PINATA_JWT secret on the Supabase project.");

      const onChain = await readProductMetadata(network, entry.collection, entry.candyMachine);
      if (!onChain) throw new HttpError(409, "The collection or candy machine isn’t readable on-chain.");
      if (onChain.collectionAuthority !== admin || onChain.machineAuthority !== admin) {
        throw new HttpError(403, "This wallet isn’t the on-chain update authority for this item.");
      }
      const copies = await assetsInCollection(network, entry.collection);

      const { image, metadata, meta, provider } = await uploadArtwork(kind, row);
      const pendingMetadata = {
        imageUri: image.uri,
        imageUrl: image.url,
        metadataUri: meta.uri,
        metadataUrl: meta.url,
        metadata,
        storage: provider,
        preparedAt: new Date().toISOString(),
      };
      await save(db, kind, row, network, { ...entry, pendingMetadata });
      return {
        plan: {
          network,
          authority: admin,
          collection: entry.collection,
          candyMachine: entry.candyMachine,
          metadataUrl: meta.url,
          // Kept as deployed: copy names and supply don't change.
          hiddenName: onChain.hiddenName,
          supply: onChain.itemsAvailable,
          assets: copies.map((c) => c.address),
        },
      };
    }

    case "confirmMetadataUpdate": {
      const p = entry.pendingMetadata;
      if (!p) throw new HttpError(409, "No artwork update in progress — start it again.");
      const problems: string[] = [];
      const onChain = await readProductMetadata(network, entry.collection, entry.candyMachine);
      if (!onChain) problems.push("collection or candy machine not readable");
      else {
        if (onChain.collectionUri !== p.metadataUrl) problems.push("collection still has the old metadata");
        if (onChain.hiddenUri !== p.metadataUrl) problems.push("candy machine still mints with the old metadata");
      }
      const copies = await assetsInCollection(network, entry.collection);
      const states = await readAssetStates(network, copies.map((c) => c.address));
      const stale = [...states.entries()].filter(([, s]) => s.state === "live" && s.uri !== p.metadataUrl).map(([a]) => a);
      if (stale.length) problems.push(`${stale.length} cop${stale.length === 1 ? "y" : "ies"} still on the old metadata`);
      if (problems.length) throw new HttpError(409, "The artwork update isn’t visible on-chain as expected yet.", problems);

      const signatures = Array.isArray(body.signatures) ? body.signatures.map(String).slice(0, 50) : [];
      const { pendingMetadata: _done, ...rest } = entry;
      const saved = await save(db, kind, row, network, {
        ...rest,
        imageUri: p.imageUri,
        imageUrl: p.imageUrl,
        metadataUri: p.metadataUri,
        metadataUrl: p.metadataUrl,
        metadata: p.metadata,
        storage: p.storage,
        metadataUpdatedAt: new Date().toISOString(),
        transactions: [...(rest.transactions ?? []), ...signatures.map((s: string) => ({ kind: "metadata", signature: s }))],
      });
      // Keep the registry's cached metadata in step with the chain.
      await db
        .from("nfts")
        .update({ metadata_uri: p.metadataUrl, metadata_json: p.metadata })
        .match({ network, collection_address: entry.collection });
      return { ...(await status(db, kind, row, network)), nft: saved };
    }

    default:
      throw new HttpError(400, "Unknown NFT action.");
  }
}
