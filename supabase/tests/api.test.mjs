// End-to-end checks of the catalogue backend against a running Supabase
// (local: `npx supabase start`, then `npx supabase functions serve`).
//
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
//     node --test supabase/tests/api.test.mjs
//
// Uses a throwaway ed25519 keypair as the admin wallet (added to and removed
// from public.admins with the service role) and cleans up what it creates.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bs58 from "bs58";
import pngjs from "pngjs";

const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");

const ID = `test-cap-${Date.now().toString(36)}`;
const CYBER_ONLY = `${ID}-cyber`;

function wallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  return { address: bs58.encode(raw), privateKey };
}

function session(w, purpose, { issued = new Date(), tamper = false } = {}) {
  const message = [
    "Sign in to Fuchey",
    `Purpose: ${purpose}`,
    `Wallet: ${w.address}`,
    "Network: devnet",
    `Issued: ${issued.toISOString()}`,
    "",
    "test",
  ].join("\n");
  const signature = crypto.sign(null, Buffer.from(tamper ? message + "x" : message), w.privateKey);
  return Buffer.from(JSON.stringify({ wallet: w.address, message, signature: signature.toString("base64") })).toString(
    "base64",
  );
}

async function call(name, body, token) {
  const response = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
      ...(token ? { "x-fuchey-session": token } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function rest(path, { key = ANON, ...init } = {}) {
  const response = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

// A small transparent PNG "cap": 24×8 red band with transparent corners.
function capPng() {
  const png = new pngjs.PNG({ width: 24, height: 8 });
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 24; x++) {
      const i = (y * 24 + x) * 4;
      const inside = y > 1 || (x > 3 && x < 20);
      png.data.set(inside ? [220, 60, 60, 255] : [0, 0, 0, 0], i);
    }
  return pngjs.PNG.sync.write(png);
}

const admin = wallet();
const stranger = wallet();
let adminToken;

before(async () => {
  const r = await rest("admins", { key: SERVICE, method: "POST", body: JSON.stringify({ wallet: admin.address }) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  adminToken = session(admin, "admin");
});

after(async () => {
  await rest(`wearables?id=in.(${ID},${CYBER_ONLY})`, { key: SERVICE, method: "DELETE" });
  await rest(`loadouts?wallet=eq.${admin.address}`, { key: SERVICE, method: "DELETE" });
  await rest(`admins?wallet=eq.${admin.address}`, { key: SERVICE, method: "DELETE" });
});

test("public catalogue serves the seeded items with their render data", async () => {
  const { status, body } = await rest("wearables?select=id,type,compatible_characters,visual&id=eq.blue-beanie");
  assert.equal(status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].visual.kind, "runs");
  assert.ok(body[0].visual.front.length > 10, "beanie has its pixel runs");
  assert.deepEqual(body[0].compatible_characters, ["yeti", "cyber"]);
});

test("anon can't write the catalogue directly", async () => {
  const r = await rest("wearables", {
    method: "POST",
    body: JSON.stringify({ id: "hack", name: "x", type: "hat", visual: { kind: "runs" } }),
  });
  assert.ok(r.status >= 400, `expected rejection, got ${r.status}`);
});

test("admin endpoints reject missing, forged, expired and non-admin sessions", async () => {
  assert.equal((await call("admin", { action: "session" })).status, 401);
  assert.equal((await call("admin", { action: "session" }, session(admin, "admin", { tamper: true }))).status, 401);
  const old = new Date(Date.now() - 13 * 60 * 60 * 1000);
  assert.equal((await call("admin", { action: "session" }, session(admin, "admin", { issued: old }))).status, 401);
  assert.equal((await call("admin", { action: "session" }, session(admin, "loadout"))).status, 401);
  assert.equal((await call("admin", { action: "session" }, session(stranger, "admin"))).status, 403);
  const ok = await call("admin", { action: "session" }, adminToken);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.wallet, admin.address);
});

test("admin uploads a layer, creates and publishes a wearable; it appears in the public API", async () => {
  const up = await call(
    "admin",
    { action: "upload", folder: `wearables/${ID}`, contentType: "image/png", data: capPng().toString("base64") },
    adminToken,
  );
  assert.equal(up.status, 200, JSON.stringify(up.body));
  const image = await fetch(up.body.url);
  assert.equal(image.status, 200, "uploaded art is publicly readable");

  const wearable = {
    id: ID,
    name: "Test Cap",
    description: "Created by the API test.",
    type: "hat",
    rarity: "rare",
    compatible_characters: ["yeti"],
    status: "available",
    price: 0.1,
    supply: 10,
    visual: { kind: "image", layer: "hat", z: 0, image: up.body.url, width: 24, height: 8, x: 32, y: -2, scale: 1 },
    published: false,
  };

  const draft = await call("admin", { action: "saveWearable", wearable }, adminToken);
  assert.equal(draft.status, 200, JSON.stringify(draft.body));
  assert.equal((await rest(`wearables?id=eq.${ID}`)).body.length, 0, "drafts stay private");

  const pub = await call("admin", { action: "saveWearable", wearable: { ...wearable, published: true } }, adminToken);
  assert.equal(pub.status, 200);
  const live = (await rest(`wearables?id=eq.${ID}`)).body[0];
  assert.equal(live.name, "Test Cap");
  assert.deepEqual(live.visual, { ...wearable.visual, image: up.body.url });
  assert.deepEqual(live.compatible_characters, ["yeti"]);
});

test("validation rejects bad visuals and unknown characters", async () => {
  const bad = await call(
    "admin",
    {
      action: "saveWearable",
      wearable: {
        id: `${ID}-bad`,
        name: "Bad",
        type: "hat",
        compatible_characters: ["nobody"],
        visual: { kind: "image", x: 0, y: 0, scale: 1, width: 10, height: 10 },
      },
    },
    adminToken,
  );
  assert.equal(bad.status, 400);
  const details = bad.body.details.join("\n");
  assert.match(details, /compatible_characters: unknown character/);
  assert.match(details, /visual.image: required/);
});

test("loadouts: compatible items save, incompatible ones are refused, ids only", async () => {
  const cyber = await call(
    "admin",
    {
      action: "saveWearable",
      wearable: {
        id: CYBER_ONLY,
        name: "Cyber Only",
        type: "headwear",
        compatible_characters: ["cyber"],
        visual: { kind: "runs", front: [{ x: 40, y: 10, w: 8, c: "#38d6ee" }] },
        published: true,
      },
    },
    adminToken,
  );
  assert.equal(cyber.status, 200, JSON.stringify(cyber.body));

  const token = session(admin, "loadout");
  const ok = await call(
    "loadout",
    { characterId: "yeti", slots: { hat: ID, outfit: "explorer-jacket", accessory: "pixel-glasses" } },
    token,
  );
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(ok.body.loadout.slots, { hat: ID, outfit: "explorer-jacket", accessory: "pixel-glasses" });

  const saved = (await rest(`loadouts?wallet=eq.${admin.address}&character_id=eq.yeti`)).body[0];
  assert.deepEqual(saved.slots, { hat: ID, outfit: "explorer-jacket", accessory: "pixel-glasses" });

  const wrongChar = await call("loadout", { characterId: "yeti", slots: { headwear: CYBER_ONLY } }, token);
  assert.equal(wrongChar.status, 400);
  assert.match(wrongChar.body.details.join(), /doesn’t fit yeti/);

  const wrongSlot = await call("loadout", { characterId: "yeti", slots: { outfit: ID } }, token);
  assert.equal(wrongSlot.status, 400);

  const locked = await call("loadout", { characterId: "rhino", slots: {} }, token);
  assert.equal(locked.status, 400, "placeholder characters can't be dressed");

  const forged = await call("loadout", { characterId: "yeti", slots: {} }, session(admin, "loadout", { tamper: true }));
  assert.equal(forged.status, 401);
});
