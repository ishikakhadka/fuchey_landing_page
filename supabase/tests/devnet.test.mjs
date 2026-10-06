// End-to-end on Solana devnet (free test SOL, no real funds):
//
//   deploy a product with the same code the admin dashboard runs
//   (src/services/nft/deploy.js) → open its sale → a buyer mints a copy →
//   the backend verifies the purchase and resolves the buyer's inventory.
//
// Also checks the backend's lightweight decoders (functions/_shared/nft/
// accounts.ts) read exactly what the official Metaplex SDK reads.
//
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (local stack,
//   functions served), optionally DEVNET_RPC, and
//   DEVNET_KEYPAIR=<path to a devnet keypair JSON with ~1 devnet SOL> — the
//   admin wallet; it funds the buyer. Without it the test tries the devnet
//   faucet, which is often rate-limited. (Fund one at https://faucet.solana.com.)
//   node --experimental-strip-types --test supabase/tests/devnet.test.mjs

import fs from "node:fs";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, keypairIdentity, publicKey, sol, some, transactionBuilder } from "@metaplex-foundation/umi";
import { fetchAssetV1, fetchCollectionV1, mplCore, transferV1 } from "@metaplex-foundation/mpl-core";
import { fetchCandyGuard, fetchCandyMachine, findCandyGuardPda, mintV1, mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { setComputeUnitLimit, transferSol } from "@metaplex-foundation/mpl-toolbox";
import { base58 } from "@metaplex-foundation/umi/serializers";

import { deployWithUmi, updateSaleWithUmi } from "../../src/services/nft/deploy.js";
import { decodeAsset, decodeCandyGuard, decodeCandyMachine, decodeCollection } from "../functions/_shared/nft/accounts.ts";

const RPC = process.env.DEVNET_RPC ?? "https://api.devnet.solana.com";
const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");

const ITEM = `devnet-test-${Date.now().toString(36)}`;
const umiFor = (kp) => createUmi(RPC, "confirmed").use(mplCore()).use(mplCandyMachine()).use(keypairIdentity(kp));

const base = createUmi(RPC, "confirmed");
const adminKp = process.env.DEVNET_KEYPAIR
  ? base.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(process.env.DEVNET_KEYPAIR, "utf8"))))
  : generateSigner(base);
const buyerKp = generateSigner(base);
const admin = umiFor(adminKp);
const buyer = umiFor(buyerKp);
const state = {};

async function raw(address) {
  const acc = await base.rpc.getAccount(publicKey(address));
  assert.ok(acc.exists, `account ${address} exists`);
  return acc.data;
}
async function call(name, body) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function rest(path, init = {}) {
  return fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...init.headers },
  });
}
async function airdrop(umi, who, amount) {
  for (let i = 0; i < 4; i++) {
    try {
      await umi.rpc.airdrop(who, sol(amount), { commitment: "confirmed" });
      return;
    } catch (e) {
      if (i === 3) throw new Error(`devnet faucet refused the airdrop (${e.message}); rerun later`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

before(async () => {
  if (process.env.DEVNET_KEYPAIR) {
    // Admin pays: rent for the deployment, and 0.1 SOL to the buyer.
    await transferSol(admin, { destination: buyerKp.publicKey, amount: sol(0.1) }).sendAndConfirm(admin);
  } else {
    await airdrop(base, adminKp.publicKey, 1);
    await airdrop(base, buyerKp.publicKey, 0.5);
  }
});

after(async () => {
  await rest(`nfts?asset_id=eq.${ITEM}`, { method: "DELETE" }); // cascades to nft_ownership
  await rest(`purchases?asset_id=eq.${ITEM}`, { method: "DELETE" });
  await rest(`wearables?id=eq.${ITEM}`, { method: "DELETE" });
});

test("deploy with the dashboard's code; decoders match the SDK", async () => {
  const plan = {
    authority: adminKp.publicKey.toString(),
    title: "Fuchey Devnet Test",
    copyName: "Devnet Test",
    metadataUrl: "https://example.com/fuchey-devnet-test.json",
    supply: 5,
    price: 0.01,
    treasury: adminKp.publicKey.toString(),
    limitPerWallet: 2,
  };
  const out = await deployWithUmi(admin, plan);
  Object.assign(state, out, { plan, candyGuard: findCandyGuardPda(admin, { base: publicKey(out.candyMachine) })[0].toString() });
  assert.ok(out.signatures.length >= 1);

  const [col, cm, guard] = await Promise.all([
    fetchCollectionV1(base, publicKey(out.collection)),
    fetchCandyMachine(base, publicKey(out.candyMachine)),
    fetchCandyGuard(base, publicKey(state.candyGuard)),
  ]);

  const dCol = decodeCollection(await raw(out.collection));
  assert.deepEqual(
    { ua: dCol.updateAuthority, name: dCol.name, uri: dCol.uri },
    { ua: col.updateAuthority.toString(), name: col.name, uri: col.uri },
  );
  assert.equal(dCol.updateAuthority, plan.authority);

  const dCm = decodeCandyMachine(await raw(out.candyMachine));
  assert.deepEqual(
    {
      authority: dCm.authority,
      mintAuthority: dCm.mintAuthority,
      collection: dCm.collectionMint,
      available: dCm.itemsAvailable,
      redeemed: dCm.itemsRedeemed,
      uri: dCm.hidden?.uri,
      name: dCm.hidden?.name,
    },
    {
      authority: cm.authority.toString(),
      mintAuthority: cm.mintAuthority.toString(),
      collection: cm.collectionMint.toString(),
      available: Number(cm.data.itemsAvailable),
      redeemed: Number(cm.itemsRedeemed),
      uri: cm.data.hiddenSettings.value.uri,
      name: cm.data.hiddenSettings.value.name,
    },
  );
  assert.equal(dCm.mintAuthority, state.candyGuard, "machine is wrapped by its guard");

  const dGuard = decodeCandyGuard(await raw(state.candyGuard));
  const g = guard.guards;
  assert.equal(dGuard.base, out.candyMachine);
  assert.equal(dGuard.authority, guard.authority.toString());
  assert.deepEqual(dGuard.guards.enabled.sort(), ["mintLimit", "solPayment", "startDate"]);
  assert.equal(dGuard.guards.solPayment.lamports, g.solPayment.value.lamports.basisPoints);
  assert.equal(dGuard.guards.solPayment.destination, g.solPayment.value.destination.toString());
  assert.equal(dGuard.guards.startDate, g.startDate.value.date);
  assert.deepEqual(dGuard.guards.mintLimit, { id: g.mintLimit.value.id, limit: g.mintLimit.value.limit });
  assert.ok(Number(dGuard.guards.startDate) > Date.now() / 1000 + 1e8, "sale starts closed");
});

test("opening the sale updates the guard on-chain", async () => {
  await updateSaleWithUmi(admin, { ...state.plan, candyGuard: state.candyGuard, state: "active" });
  const dGuard = decodeCandyGuard(await raw(state.candyGuard));
  assert.ok(Number(dGuard.guards.startDate) <= Date.now() / 1000 + 5, "sale is open");
  assert.equal(dGuard.guards.endDate, null);
});

test("a buyer mints a copy; the backend verifies it and resolves inventory", async () => {
  // The backend only recognises collections a Fuchey item has deployed.
  const r = await rest("wearables", {
    method: "POST",
    body: JSON.stringify({
      id: ITEM,
      name: "Devnet Test",
      type: "accessory",
      compatible_characters: ["yeti"],
      visual: { kind: "runs", front: [] },
      published: false,
      nft: { devnet: { status: "minted", collection: state.collection, candyMachine: state.candyMachine, candyGuard: state.candyGuard } },
    }),
  });
  assert.equal(r.status, 201, await r.text());

  const asset = generateSigner(buyer);
  const res = await transactionBuilder()
    .add(setComputeUnitLimit(buyer, { units: 400_000 }))
    .add(
      mintV1(buyer, {
        candyMachine: publicKey(state.candyMachine),
        collection: publicKey(state.collection),
        asset,
        mintArgs: {
          solPayment: some({ destination: publicKey(state.plan.treasury) }),
          mintLimit: some({ id: 1 }),
        },
      }),
    )
    .sendAndConfirm(buyer, { confirm: { commitment: "confirmed" } });
  const signature = base58.deserialize(res.signature)[0];

  const onChain = await fetchAssetV1(base, asset.publicKey);
  const decoded = decodeAsset(await raw(asset.publicKey.toString()));
  assert.equal(decoded.owner, onChain.owner.toString());
  assert.equal(decoded.owner, buyerKp.publicKey.toString());
  assert.equal(decoded.collection, state.collection);
  assert.equal(decoded.name, onChain.name);
  assert.equal(decoded.name, "Devnet Test #1");

  const wallet = buyerKp.publicKey.toString();
  const forged = await call("purchase-verify", { network: "devnet", signature, asset: asset.publicKey.toString(), wallet: adminKp.publicKey.toString() });
  assert.equal(forged.status, 409, "another wallet can't claim the purchase");

  let verified;
  for (let i = 0; i < 5; i++) {
    verified = await call("purchase-verify", { network: "devnet", signature, asset: asset.publicKey.toString(), wallet });
    if (verified.status === 200) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.deepEqual(
    { kind: verified.body.kind, id: verified.body.assetId },
    { kind: "wearable", id: ITEM },
  );

  const inv = await call("inventory", { wallet, network: "devnet" });
  assert.equal(inv.status, 200, JSON.stringify(inv.body));
  assert.deepEqual(inv.body.wearables.map((w) => [w.assetId, w.asset]), [[ITEM, asset.publicKey.toString()]]);
  assert.deepEqual(inv.body.characters, []);
  assert.deepEqual(inv.body.assets, [
    { assetId: ITEM, type: "wearable", nftAssetAddress: asset.publicKey.toString(), ownerWallet: wallet, name: "Devnet Test" },
  ]);

  // The purchase registered the NFT and its first owner, from the chain.
  const [nft] = await (await rest(`nfts?asset_id=eq.${ITEM}&select=*,nft_ownership(*)`)).json();
  assert.equal(nft.asset_address, asset.publicKey.toString());
  assert.equal(nft.collection_address, state.collection);
  assert.equal(nft.mint_signature, signature);
  assert.equal(nft.status, "owned");
  assert.ok(nft.minted_at && nft.metadata_uri);
  assert.deepEqual(
    nft.nft_ownership.map((o) => [o.owner_wallet, o.acquisition_source, o.acquisition_signature, o.is_current]),
    [[wallet, "marketplace", signature, true]],
  );
  state.asset = asset.publicKey.toString();
});

test("a transfer outside the marketplace is picked up from the chain, with history", async () => {
  const receiver = generateSigner(base).publicKey.toString();
  await transferV1(buyer, {
    asset: publicKey(state.asset),
    collection: publicKey(state.collection),
    newOwner: publicKey(receiver),
  }).sendAndConfirm(buyer, { confirm: { commitment: "confirmed" } });

  // The old owner's inventory no longer lists it, and re-reading it records the new owner.
  const inv = await call("inventory", { wallet: buyerKp.publicKey.toString(), network: "devnet" });
  assert.equal(inv.status, 200, JSON.stringify(inv.body));
  assert.deepEqual(inv.body.assets, []);

  const [nft] = await (await rest(`nfts?asset_id=eq.${ITEM}&select=status,nft_ownership(*)`)).json();
  assert.equal(nft.status, "owned");
  const periods = nft.nft_ownership.sort((a, b) => a.id - b.id);
  assert.deepEqual(
    periods.map((o) => [o.owner_wallet, o.acquisition_source, o.is_current, o.ended_reason]),
    [
      [buyerKp.publicKey.toString(), "marketplace", false, "transferred"],
      [receiver, "transfer", true, null],
    ],
  );

  const theirs = await call("inventory", { wallet: receiver, network: "devnet" });
  assert.deepEqual(theirs.body.assets.map((a) => a.nftAssetAddress), [state.asset]);
});
