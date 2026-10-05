// NFT lifecycle checks that don't need IPFS keys or SOL: state, metadata,
// validation gates, and that nothing can be marked minted without the chain.
// Same setup as api.test.mjs (SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY, functions served).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bs58 from "bs58";

const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");

const ID = `nft-test-${Date.now().toString(36)}`;
const NET = { kind: "wearable", id: ID, network: "devnet" };

function wallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return { address: bs58.encode(Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url")), privateKey };
}
function session(w) {
  const message = `Sign in to Fuchey\nPurpose: admin\nWallet: ${w.address}\nNetwork: devnet\nIssued: ${new Date().toISOString()}\n\ntest`;
  const signature = crypto.sign(null, Buffer.from(message), w.privateKey).toString("base64");
  return Buffer.from(JSON.stringify({ wallet: w.address, message, signature })).toString("base64");
}
async function call(name, body, token) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(token ? { "x-fuchey-session": token } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function rest(path, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
}

const admin = wallet();
let token;
const wearable = {
  id: ID,
  name: "NFT Test Glasses",
  description: "Lifecycle test item.",
  type: "accessory",
  rarity: "rare",
  compatible_characters: ["yeti", "cyber"],
  status: "available",
  price: 0.5,
  supply: 500,
  visual: { kind: "runs", front: [{ x: 40, y: 12, w: 8, c: "#ff5fa2" }] },
  published: true,
};

before(async () => {
  await rest("admins", { method: "POST", body: JSON.stringify({ wallet: admin.address }) });
  token = session(admin);
  const r = await call("admin", { action: "saveWearable", wearable }, token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

after(async () => {
  await rest(`wearables?id=eq.${ID}`, { method: "DELETE" });
  await rest(`admins?wallet=eq.${admin.address}`, { method: "DELETE" });
});

test("status starts not-configured and lists what's missing", async () => {
  const r = await call("admin", { action: "nftStatus", ...NET }, token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.status, "not-configured");
  assert.ok(r.body.problems.some((p) => p.startsWith("image_url")), "artwork required");
  assert.equal(r.body.collectionGroup.id, "fuchey-wearables");
  assert.equal(r.body.listing, null);
});

test("metadata preview maps the asset, with no private fields", async () => {
  const r = await call("admin", { action: "previewMetadata", ...NET }, token);
  assert.equal(r.status, 200);
  const m = r.body.metadata;
  assert.equal(m.name, "Fuchey NFT Test Glasses");
  assert.equal(m.symbol, "FUCHEY");
  const traits = Object.fromEntries(m.attributes.map((a) => [a.trait_type, a.value]));
  assert.deepEqual(
    { type: traits["Asset Type"], id: traits["Fuchey ID"], slot: traits["Wearable Type"], rarity: traits.Rarity },
    { type: "Wearable", id: ID, slot: "Accessory", rarity: "Rare" },
  );
  assert.equal(m.properties.fuchey.assetId, ID);
  const text = JSON.stringify(m);
  for (const secret of ["price", "supply", "limit_per_wallet", "visual", "published", "compatible"]) {
    assert.ok(!text.includes(`"${secret}`), `metadata must not include ${secret}`);
  }
});

test("generating metadata needs artwork, then storage — never fakes an upload", async () => {
  const noArt = await call("admin", { action: "generateMetadata", ...NET }, token);
  assert.equal(noArt.status, 400);
  assert.match(noArt.body.details.join(), /artwork/);

  const withArt = await call(
    "admin",
    { action: "saveWearable", wearable: { ...wearable, image_url: `${URL_}/storage/v1/object/public/catalog-art/none.png` } },
    token,
  );
  assert.equal(withArt.status, 200);
  const r = await call("admin", { action: "generateMetadata", ...NET }, token);
  if (r.status === 503) {
    assert.match(r.body.error, /PINATA_JWT/);
    const s = await call("admin", { action: "nftStatus", ...NET }, token);
    assert.equal(s.body.status, "ready", "nothing recorded when storage isn't configured");
    assert.equal(s.body.nft.metadataUri, undefined);
  } else {
    // Storage configured: the placeholder image URL 404s, so the upload must fail cleanly.
    assert.equal(r.status, 400, JSON.stringify(r.body));
    const s = await call("admin", { action: "nftStatus", ...NET }, token);
    assert.equal(s.body.status, "failed");
  }
});

test("minting and listing are refused before their prerequisites", async () => {
  const mint = await call("admin", { action: "prepareMint", ...NET }, token);
  assert.equal(mint.status, 400);
  assert.match(mint.body.error, /metadata/i);
  const sale = await call("admin", { action: "prepareSale", ...NET, state: "active" }, token);
  assert.equal(sale.status, 409);
  const confirm = await call("admin", { action: "confirmMint", ...NET, signatures: ["x"] }, token);
  assert.equal(confirm.status, 409);
  const mainnet = await call("admin", { action: "nftStatus", ...NET, network: "mainnet-beta" }, token);
  assert.equal(mainnet.status, 400, "mainnet stays disabled until enabled explicitly");
});

test("saving an asset can't set NFT state; deployed assets can't be deleted", async () => {
  const fake = { devnet: { status: "minted", collection: "11111111111111111111111111111111" } };
  await call("admin", { action: "saveWearable", wearable: { ...wearable, nft: fake } }, token);
  const row = (await rest(`wearables?id=eq.${ID}&select=nft`)).body[0];
  assert.notEqual(row.nft?.devnet?.status, "minted");

  await rest(`wearables?id=eq.${ID}`, { method: "PATCH", body: JSON.stringify({ nft: { devnet: { status: "minted" } } }) });
  const del = await call("admin", { action: "deleteWearable", id: ID }, token);
  assert.equal(del.status, 409);
  await rest(`wearables?id=eq.${ID}`, { method: "PATCH", body: JSON.stringify({ nft: {} }) });
});

test("inventory resolves any wallet address; purchase-verify rejects unproven claims", async () => {
  const someone = wallet().address;
  const inv = await call("inventory", { wallet: someone, network: "devnet" });
  assert.equal(inv.status, 200, JSON.stringify(inv.body));
  assert.deepEqual([inv.body.characters, inv.body.wearables], [[], []]);
  assert.equal(inv.body.chain, "solana");

  assert.equal((await call("inventory", { wallet: "not-a-wallet" })).status, 400);

  const fakeSig = bs58.encode(crypto.randomBytes(64));
  const v = await call("purchase-verify", { network: "devnet", signature: fakeSig, asset: someone, wallet: someone });
  assert.equal(v.status, 409);
  assert.match(v.body.error, /not verified/);
});
