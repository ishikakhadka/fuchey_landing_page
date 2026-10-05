// Deploys the Fuchey marketplace on-chain: for every catalogue item that is
// on sale, uploads its image + metadata, creates a Metaplex Core collection,
// and a Core Candy Machine whose guards enforce the listing on-chain:
//
//   price          → solPayment guard (paid to TREASURY)
//   supply         → itemsAvailable
//   per-wallet cap → mintLimit guard
//
// Items come from the Supabase catalogue (status "available"); the addresses
// created here are written back to each row's `nft[<network>]`, which the
// website reads. Listing an item in the admin dashboard never mints anything —
// this script is the explicit "create the NFT side" step. Re-running skips
// items that already have a candy machine on this network, so it is safe to
// resume.
//
// Usage (run `node make-art.mjs` first for the built-in art):
//   FUCHEY_KEYPAIR=/path/to/devnet-keypair.json
//   SUPABASE_URL=https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service role key>
//   node setup-marketplace.mjs
//
// NFT images: nft/out/images/<id>.png if it exists, otherwise the item's
// uploaded image (wearables: image_url; characters: an uploaded base image).
// The service-role key is only read from the environment and never printed.
//
// Optional env:
//   TREASURY=<address>       where payments go (default: the keypair's address)
//   SOLANA_NETWORK=devnet    only devnet is allowed unless ALLOW_MAINNET=1
//   RPC_URL=<url>            custom RPC
//   ONLY=yeti,blue-beanie    deploy just these items
//
// The keypair is only read locally to sign; it is never printed or uploaded.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  generateSigner,
  keypairIdentity,
  none,
  publicKey,
  sol,
  some,
} from "@metaplex-foundation/umi";
import { createCollection, mplCore } from "@metaplex-foundation/mpl-core";
import {
  create,
  findCandyGuardPda,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

const here = path.dirname(fileURLToPath(import.meta.url));
const NETWORK = process.env.SOLANA_NETWORK ?? "devnet";
const RPC = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

if (NETWORK !== "devnet" && process.env.ALLOW_MAINNET !== "1") {
  console.error(`Refusing to deploy to ${NETWORK}. Set ALLOW_MAINNET=1 if you really mean it.`);
  process.exit(1);
}

const keypairPath = process.env.FUCHEY_KEYPAIR;
if (!keypairPath || !fs.existsSync(keypairPath)) {
  console.error("Set FUCHEY_KEYPAIR to the path of your devnet keypair JSON file.");
  process.exit(1);
}

const umi = createUmi(process.env.RPC_URL ?? RPC[NETWORK], "confirmed")
  .use(mplCore())
  .use(mplCandyMachine())
  .use(
    irysUploader({
      address: NETWORK === "devnet" ? "https://devnet.irys.xyz" : "https://node1.irys.xyz",
    }),
  );

const secret = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(secret)));

const treasury = publicKey(process.env.TREASURY ?? umi.identity.publicKey);
// --- catalogue (Supabase, service role) -------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to read and update the catalogue.");
  process.exit(1);
}

async function rest(pathAndQuery, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response.json();
}

const [characterRows, wearableRows] = await Promise.all([
  rest("characters?select=*&status=eq.available"),
  rest("wearables?select=*&status=eq.available"),
]);

const listingOf = (r) => ({
  price: r.price == null ? null : Number(r.price),
  supply: r.supply,
  limitPerWallet: r.limit_per_wallet,
});

const only = process.env.ONLY?.split(",").map((s) => s.trim());
const items = [
  ...characterRows.map((r) => ({
    kind: "character",
    table: "characters",
    id: r.id,
    name: r.name,
    title: r.title,
    description: r.description,
    rarity: r.rarity,
    attributes: r.attributes,
    imageUrl: r.art?.kind === "character" && /^https?:/.test(r.art.image) ? r.art.image : null,
    listing: listingOf(r),
    nft: r.nft ?? {},
  })),
  ...wearableRows.map((r) => ({
    kind: "wearable",
    table: "wearables",
    id: r.id,
    name: r.name,
    title: `Fuchey ${r.name}`,
    description: r.description,
    rarity: r.rarity,
    type: r.type,
    imageUrl: r.image_url,
    listing: listingOf(r),
    nft: r.nft ?? {},
  })),
].filter((item) => !only || only.includes(item.id));

async function saveNft(item, entry) {
  item.nft = { ...item.nft, [NETWORK]: entry };
  await rest(`${item.table}?id=eq.${encodeURIComponent(item.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ nft: item.nft }),
  });
}

async function imageBytes(item) {
  const local = path.join(here, "out/images", `${item.id}.png`);
  if (fs.existsSync(local)) return fs.readFileSync(local);
  if (item.imageUrl) {
    const response = await fetch(item.imageUrl);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
  }
  throw new Error(`No image for ${item.id}: add nft/out/images/${item.id}.png or upload one in the admin dashboard.`);
}

function metadataFor(item, imageUri, { collection = false } = {}) {
  const attributes = [
    ...(item.attributes ?? []),
    { trait_type: "Type", value: item.kind === "character" ? "Character" : "Wearable" },
    ...(item.kind === "wearable" ? [{ trait_type: "Slot", value: item.type }] : []),
    { trait_type: "Rarity", value: item.rarity },
  ];

  return {
    name: collection ? `${item.title} Collection` : item.title,
    symbol: "FUCHEY",
    description: item.description,
    image: imageUri,
    external_url: "https://github.com/belly1v123/Fuchey",
    attributes,
    properties: {
      category: "image",
      files: [{ uri: imageUri, type: "image/png" }],
    },
  };
}

async function deploy(item) {
  if (item.listing.supply == null || item.listing.price == null) {
    throw new Error(`${item.id}: set a price and supply before deploying.`);
  }
  const bytes = await imageBytes(item);

  console.log(`\n${item.title}`);

  const file = createGenericFile(bytes, `${item.id}.png`, {
    contentType: "image/png",
  });
  const [imageUri] = await umi.uploader.upload([file]);
  const metadataUri = await umi.uploader.uploadJson(metadataFor(item, imageUri));
  const collectionUri = await umi.uploader.uploadJson(metadataFor(item, imageUri, { collection: true }));
  console.log("  metadata  ", metadataUri);

  const collection = generateSigner(umi);
  await createCollection(umi, {
    collection,
    name: `${item.title} Collection`,
    uri: collectionUri,
  }).sendAndConfirm(umi);
  console.log("  collection", collection.publicKey.toString());

  const { price, supply, limitPerWallet } = item.listing;
  const candyMachine = generateSigner(umi);
  const mintLimitId = limitPerWallet ? 1 : null;

  await (
    await create(umi, {
      candyMachine,
      collection: collection.publicKey,
      collectionUpdateAuthority: umi.identity,
      itemsAvailable: supply,
      isMutable: true,
      configLineSettings: none(),
      hiddenSettings: some({
        // $ID+1$ is replaced on-chain with the mint number: "Yeti #1", "Yeti #2", …
        name: `${item.name} #$ID+1$`,
        uri: metadataUri,
        hash: crypto.createHash("sha256").update(metadataUri).digest(),
      }),
      guards: {
        solPayment: price > 0 ? some({ lamports: sol(price), destination: treasury }) : none(),
        mintLimit: mintLimitId ? some({ id: mintLimitId, limit: limitPerWallet }) : none(),
      },
    })
  ).sendAndConfirm(umi);

  const candyGuard = findCandyGuardPda(umi, { base: candyMachine.publicKey })[0];
  console.log("  candy machine", candyMachine.publicKey.toString());

  await saveNft(item, {
    collection: collection.publicKey.toString(),
    candyMachine: candyMachine.publicKey.toString(),
    candyGuard: candyGuard.toString(),
    treasury: treasury.toString(),
    metadataUri,
    imageUri,
    mintLimitId,
  });
}

console.log(`Deploying ${items.length} item(s) to ${NETWORK} as ${umi.identity.publicKey}`);
console.log(`Payments go to ${treasury}`);

for (const item of items) {
  if (item.nft[NETWORK]?.candyMachine) {
    console.log(`\n${item.title}: already deployed, skipping`);
    continue;
  }
  await deploy(item);
}

console.log(`\nDone. Addresses saved to the catalogue (nft.${NETWORK}).`);
