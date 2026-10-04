// Deploys the Fuchey marketplace on-chain: for every catalogue item that is
// on sale, uploads its image + metadata, creates a Metaplex Core collection,
// and a Core Candy Machine whose guards enforce the listing on-chain:
//
//   price          → solPayment guard (paid to TREASURY)
//   supply         → itemsAvailable
//   per-wallet cap → mintLimit guard
//
// Results go to src/data/deployments/<network>.json, which the website reads.
// Re-running skips items that are already deployed, so it is safe to resume.
//
// Usage (run `node make-art.mjs` first):
//   FUCHEY_KEYPAIR=/path/to/devnet-keypair.json node setup-marketplace.mjs
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

import { characters } from "../src/data/characters.js";
import { wearables } from "../src/data/wearables.js";

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
const outFile = path.join(here, `../src/data/deployments/${NETWORK}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const deployment = fs.existsSync(outFile)
  ? JSON.parse(fs.readFileSync(outFile, "utf8"))
  : { network: NETWORK, items: {} };
deployment.network = NETWORK;
deployment.authority = umi.identity.publicKey.toString();
deployment.treasury = treasury.toString();
const save = () => fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2) + "\n");

const only = process.env.ONLY?.split(",").map((s) => s.trim());
const items = [
  ...characters.map((c) => ({ ...c, kind: "character" })),
  ...wearables.map((w) => ({ ...w, kind: "wearable", title: `Fuchey ${w.name}` })),
].filter((item) => item.listing.status === "available" && (!only || only.includes(item.id)));

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
  const imagePath = path.join(here, "out/images", `${item.id}.png`);
  if (!fs.existsSync(imagePath)) throw new Error(`Missing ${imagePath} — run make-art.mjs first.`);

  console.log(`\n${item.title}`);

  const file = createGenericFile(fs.readFileSync(imagePath), `${item.id}.png`, {
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

  deployment.items[item.id] = {
    collection: collection.publicKey.toString(),
    candyMachine: candyMachine.publicKey.toString(),
    candyGuard: candyGuard.toString(),
    metadataUri,
    imageUri,
    price,
    supply,
    mintLimitId,
  };
  save();
}

console.log(`Deploying ${items.length} item(s) to ${NETWORK} as ${umi.identity.publicKey}`);
console.log(`Payments go to ${treasury}`);

for (const item of items) {
  if (deployment.items[item.id]) {
    console.log(`\n${item.title}: already deployed, skipping`);
    continue;
  }
  await deploy(item);
}

save();
console.log(`\nDone. Wrote ${path.relative(process.cwd(), outFile)}`);
