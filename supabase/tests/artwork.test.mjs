// End-to-end on Solana devnet: changing a deployed item's artwork reaches the
// chain — the copies people already own, the collection, and future copies.
//
//   create a wearable with artwork A → generate metadata (IPFS) → mint the
//   product → open the sale → a buyer mints copy #1 → switch to artwork B →
//   prepareMetadataUpdate → the admin wallet signs (dashboard code) →
//   confirmMetadataUpdate → copy #1, the collection and copy #2 all on B.
//
// Uses the admin dashboard's own code (src/services/nft/deploy.js) and the
// admin function, so it exercises exactly what the "Update artwork on-chain"
// button does. Needs the local stack with functions served, PINATA_JWT in
// supabase/functions/.env, and a funded devnet keypair (~0.1 SOL):
//
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//   DEVNET_KEYPAIR=<path to a devnet keypair JSON>
//   node --experimental-strip-types --test supabase/tests/artwork.test.mjs

import fs from "node:fs";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import pngjs from "pngjs";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, keypairIdentity, publicKey, sol, transactionBuilder } from "@metaplex-foundation/umi";
import { fetchAssetV1, fetchCollectionV1, mplCore } from "@metaplex-foundation/mpl-core";
import { fetchCandyMachine, mintV1, mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { setComputeUnitLimit, transferSol } from "@metaplex-foundation/mpl-toolbox";
import { base58 } from "@metaplex-foundation/umi/serializers";

import { deployWithUmi, updateMetadataWithUmi, updateSaleWithUmi } from "../../src/services/nft/deploy.js";

const RPC = process.env.DEVNET_RPC ?? "https://api.devnet.solana.com";
const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
if (!process.env.DEVNET_KEYPAIR) throw new Error("Set DEVNET_KEYPAIR to a funded devnet keypair JSON.");

const ID = `art-test-${Date.now().toString(36)}`;
const NET = { kind: "wearable", id: ID, network: "devnet" };
const umiFor = (kp) => createUmi(RPC, "confirmed").use(mplCore()).use(mplCandyMachine()).use(keypairIdentity(kp));
const base = createUmi(RPC, "confirmed");
const adminKp = base.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(process.env.DEVNET_KEYPAIR, "utf8"))));
const buyerKp = generateSigner(base);
const admin = umiFor(adminKp);
const buyer = umiFor(buyerKp);
const ADMIN = adminKp.publicKey.toString();
const state = {};

function session() {
  const message = `Sign in to Fuchey\nPurpose: admin\nWallet: ${ADMIN}\nNetwork: devnet\nIssued: ${new Date().toISOString()}\n\ntest`;
  const signature = Buffer.from(base.eddsa.sign(new TextEncoder().encode(message), adminKp)).toString("base64");
  return Buffer.from(JSON.stringify({ wallet: ADMIN, message, signature })).toString("base64");
}
async function call(body) {
  const r = await fetch(`${URL_}/functions/v1/admin`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", "x-fuchey-session": state.token },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function ok(body) {
  const r = await call(body);
  assert.equal(r.status, 200, `${body.action}: ${JSON.stringify(r.body)}`);
  return r.body;
}
// Confirm steps retry while the chain catches up, like the dashboard does.
async function confirm(body) {
  for (let i = 0; ; i++) {
    const r = await call({ ...body, final: i === 5 });
    if (r.status === 200) return r.body;
    if (r.status !== 409 || i === 5) assert.fail(`${body.action}: ${JSON.stringify(r.body)}`);
    await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
  }
}
async function rest(path, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...init.headers },
  });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// A 32×32 square in one colour — two colours give two different artworks.
function art(rgb) {
  const png = new pngjs.PNG({ width: 32, height: 32 });
  for (let i = 0; i < 32 * 32; i++) png.data.set([...rgb, 255], i * 4);
  return pngjs.PNG.sync.write(png).toString("base64");
}
async function setArtwork(rgb) {
  const { url } = await ok({ action: "upload", folder: `wearables/${ID}`, contentType: "image/png", data: art(rgb) });
  const wearable = {
    id: ID,
    name: "Artwork Test",
    description: "Checks that new artwork reaches minted copies.",
    type: "accessory",
    rarity: "common",
    compatible_characters: ["yeti"],
    status: "available",
    price: 0,
    supply: 5,
    image_url: url,
    visual: { kind: "runs", front: [{ x: 40, y: 12, w: 8, c: "#ff5fa2" }] },
    published: false,
  };
  await ok({ action: "saveWearable", wearable });
  return url;
}
async function mintCopy() {
  const asset = generateSigner(buyer);
  const res = await transactionBuilder()
    .add(setComputeUnitLimit(buyer, { units: 400_000 }))
    .add(mintV1(buyer, { candyMachine: publicKey(state.candyMachine), collection: publicKey(state.collection), asset }))
    .sendAndConfirm(buyer, { confirm: { commitment: "confirmed" } });
  return { asset: asset.publicKey, signature: base58.deserialize(res.signature)[0] };
}

before(async () => {
  state.wasAdmin = (await rest(`admins?wallet=eq.${ADMIN}`)).length > 0;
  if (!state.wasAdmin) await rest("admins", { method: "POST", body: JSON.stringify({ wallet: ADMIN }) });
  state.token = session();
  await transferSol(admin, { destination: buyerKp.publicKey, amount: sol(0.03) }).sendAndConfirm(admin);
});

after(async () => {
  await rest(`nfts?asset_id=eq.${ID}`, { method: "DELETE" });
  await rest(`purchases?asset_id=eq.${ID}`, { method: "DELETE" });
  await rest(`listings?asset_id=eq.${ID}`, { method: "DELETE" });
  await rest(`wearables?id=eq.${ID}`, { method: "DELETE" });
  if (!state.wasAdmin) await rest(`admins?wallet=eq.${ADMIN}`, { method: "DELETE" });
});

test("deploy with artwork A, open the sale, a buyer mints copy #1", async () => {
  state.imageA = await setArtwork([220, 60, 60]);
  const generated = await ok({ action: "generateMetadata", ...NET });
  state.metaA = generated.nft.metadataUrl;

  const { plan } = await ok({ action: "prepareMint", ...NET });
  const deployed = await deployWithUmi(admin, plan);
  Object.assign(state, deployed);
  await confirm({ action: "confirmMint", ...NET, ...deployed });

  const sale = await ok({ action: "prepareSale", ...NET, state: "active", price: 0 });
  const { signatures } = await updateSaleWithUmi(admin, sale.plan);
  await confirm({ action: "confirmSale", ...NET, signature: signatures.at(-1) });

  const minted = await mintCopy();
  state.copy1 = minted.asset;
  assert.equal((await fetchAssetV1(base, state.copy1)).uri, state.metaA);

  // Registered like a marketplace purchase.
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${URL_}/functions/v1/purchase-verify`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ network: "devnet", signature: minted.signature, asset: state.copy1.toString(), wallet: buyerKp.publicKey.toString() }),
    });
    if (r.ok) break;
    if (i === 4) assert.fail(await r.text());
    await new Promise((res) => setTimeout(res, 2000));
  }
  const [nft] = await rest(`nfts?asset_id=eq.${ID}`);
  assert.equal(nft.metadata_uri, state.metaA);
});

test("updating the artwork reaches copy #1, the collection and future copies", async () => {
  state.imageB = await setArtwork([40, 120, 230]);
  assert.notEqual(state.imageB, state.imageA);

  const { plan } = await ok({ action: "prepareMetadataUpdate", ...NET });
  assert.notEqual(plan.metadataUrl, state.metaA, "new metadata was uploaded");
  assert.deepEqual(plan.assets, [state.copy1.toString()], "the plan covers the minted copy");
  assert.equal(plan.hiddenName, "Artwork Test #$ID+1$");

  const { signatures } = await updateMetadataWithUmi(admin, plan);
  const confirmed = await confirm({ action: "confirmMetadataUpdate", ...NET, signatures });
  assert.equal(confirmed.nft.metadataUrl, plan.metadataUrl);
  assert.equal(confirmed.nft.pendingMetadata, undefined);

  // On-chain: the owned copy, the collection, the candy machine.
  const copy1 = await fetchAssetV1(base, state.copy1);
  assert.equal(copy1.uri, plan.metadataUrl);
  assert.equal(copy1.name, "Artwork Test #1", "copy names are unchanged");
  assert.equal(copy1.owner.toString(), buyerKp.publicKey.toString(), "ownership is untouched");
  assert.equal((await fetchCollectionV1(base, publicKey(state.collection))).uri, plan.metadataUrl);
  const cm = await fetchCandyMachine(base, publicKey(state.candyMachine));
  assert.equal(cm.data.hiddenSettings.value.uri, plan.metadataUrl);
  assert.equal(Number(cm.data.itemsAvailable), 5, "supply is unchanged");

  // The metadata at the new URI shows artwork B.
  const json = await (await fetch(plan.metadataUrl)).json();
  assert.equal(json.name, "Fuchey Artwork Test");
  assert.equal(json.image, confirmed.nft.imageUrl);
  assert.notEqual(json.image, (await (await fetch(state.metaA)).json()).image, "the image changed");

  // The registry's cached metadata follows.
  const [nft] = await rest(`nfts?asset_address=eq.${state.copy1}`);
  assert.equal(nft.metadata_uri, plan.metadataUrl);
  assert.equal(nft.metadata_json.image, json.image);

  // A copy minted afterwards gets the new artwork too.
  const copy2 = await fetchAssetV1(base, (await mintCopy()).asset);
  assert.equal(copy2.uri, plan.metadataUrl);
  assert.equal(copy2.name, "Artwork Test #2");

  // A second update with nothing pending is refused.
  assert.equal((await call({ action: "confirmMetadataUpdate", ...NET })).status, 409);
});
