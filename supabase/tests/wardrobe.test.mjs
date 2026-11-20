// End-to-end check of animator wardrobe publishing against a running LOCAL
// Supabase (`npx supabase start`): publish → upload → review → build the
// website visual → save the wearable, including a rejected newer version.
//
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
//     node --test supabase/tests/wardrobe.test.mjs
//
// Uses a throwaway ed25519 wallet as admin and test-only ids, and removes
// everything it creates (rows and stored files).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bs58 from "bs58";
import pngjs from "pngjs";

const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_)) throw new Error("This test only runs against a local Supabase.");

const T = Date.now().toString(36);
const PACK = `testpack${T}`;
const CHAR_A = "tc_a", CHAR_B = "tc_b";
const SITE_A = `test-wd-${T}-a`;
const WEAR = `test-wd-${T}-hat`;

function wallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  return { address: bs58.encode(raw), privateKey };
}
function session(w, purpose) {
  const message = ["Sign in to Fuchey", `Purpose: ${purpose}`, `Wallet: ${w.address}`, "Network: devnet", `Issued: ${new Date().toISOString()}`, "", "test"].join("\n");
  const signature = crypto.sign(null, Buffer.from(message), w.privateKey);
  return Buffer.from(JSON.stringify({ wallet: w.address, message, signature: signature.toString("base64") })).toString("base64");
}
async function call(name, body, token) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(token ? { "x-fuchey-session": token } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function rest(path, { key = SERVICE, ...init } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}
function png(w, h, rgba) {
  const p = new pngjs.PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) p.data.set(rgba, i * 4);
  return pngjs.PNG.sync.write(p);
}
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

const admin = wallet();
let studioToken, adminToken;
const stored = [];

before(async () => {
  assert.equal((await rest("admins", { method: "POST", body: JSON.stringify({ wallet: admin.address }) })).status, 201);
  studioToken = session(admin, "studio");
  adminToken = session(admin, "admin");
  // A site character imported from animator character CHAR_A (CHAR_B has none).
  const r = await rest("characters", {
    method: "POST",
    body: JSON.stringify({
      id: SITE_A, name: "Test A", title: "Test A", pack: "wild", rarity: "common", edition: "companion",
      art: { kind: "character", image: "https://example.com/base.png" }, wardrobe_slots: ["hat"],
      studio: { pack: PACK, character: CHAR_A, version: 1 }, published: false,
    }),
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
});

after(async () => {
  await rest(`wearables?id=eq.${WEAR}`, { method: "DELETE" });
  await rest(`studio_wearables?pack_id=eq.${PACK}`, { method: "DELETE" });
  await rest(`characters?id=eq.${SITE_A}`, { method: "DELETE" });
  await rest(`admins?wallet=eq.${admin.address}`, { method: "DELETE" });
  if (stored.length) {
    await fetch(`${URL_}/storage/v1/object/studio-art`, {
      method: "DELETE",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: stored }),
    });
  }
});

// One publish of a hat that fits both test characters; `color` changes the art.
async function publish(color, { boxB = { x: 60, y: 10, w: 30, h: 12 } } = {}) {
  const s = 2;
  const front = png(30 * s, 12 * s, color);
  const frontB = png(boxB.w * s, boxB.h * s, color);
  const preview = png(448, 464, [0, 0, 0, 0]);
  const blobs = [front, preview, frontB, front];
  const files = [
    { fit: 0, kind: "front", scale: s, width: 60, height: 24, bytes: front.length, sha256: sha(front) },
    { fit: 0, kind: "preview", scale: 2, width: 448, height: 464, bytes: preview.length, sha256: sha(preview) },
    { fit: 1, kind: "front", scale: s, width: boxB.w * s, height: boxB.h * s, bytes: frontB.length, sha256: sha(frontB) },
    { fit: null, kind: "icon", scale: s, width: 60, height: 24, bytes: front.length, sha256: sha(front) },
  ];
  const start = await call(
    "studio",
    {
      action: "startWearablePublish",
      pack: { id: PACK, name: "Test pack" },
      wearable: { slot: "hat", item: "test_cap", name: "Test cap" },
      scale: s,
      fits: [
        { character: CHAR_A, canvas: [224, 232], unit: 1, arms: "front", offset: [0, 0], box: { x: 60, y: 10, w: 30, h: 12 }, layer: { order: 20 } },
        { character: CHAR_B, canvas: [224, 232], unit: 1, arms: "front", offset: [0, -16], box: boxB, layer: { order: 20 } },
      ],
      files,
      artCheck: { errors: 0, warnings: 0 },
    },
    studioToken,
  );
  assert.equal(start.status, 200, JSON.stringify(start.body));
  for (const u of start.body.uploads) {
    stored.push(u.path);
    const r = await fetch(u.url, { method: "PUT", headers: { "Content-Type": "image/png", "x-upsert": "true" }, body: blobs[u.index] });
    assert.ok(r.ok, `upload ${u.path}: ${r.status}`);
  }
  const fin = await call("studio", { action: "finishWearablePublish", versionId: start.body.versionId }, studioToken);
  assert.equal(fin.status, 200, JSON.stringify(fin.body));
  assert.equal(fin.body.version.status, "in_review");
  return start.body;
}

let v1, v2;

test("refuses a layer that isn't the fit's box at the export scale", async () => {
  const r = await call(
    "studio",
    {
      action: "startWearablePublish",
      pack: { id: PACK, name: "Test pack" },
      wearable: { slot: "hat", item: "test_cap", name: "Test cap" },
      scale: 2,
      fits: [{ character: CHAR_A, canvas: [224, 232], box: { x: 0, y: 0, w: 10, h: 10 } }],
      files: [{ fit: 0, kind: "front", scale: 2, width: 10, height: 10, bytes: 10, sha256: "a".repeat(64) }],
    },
    studioToken,
  );
  assert.equal(r.status, 400);
  assert.ok(r.body.details.some((d) => d.includes("box at 2×")));
});

test("publishes version 1 with a fit per character, placed on the website grid", async () => {
  v1 = await publish([200, 40, 40, 255]);
  assert.equal(v1.version, 1);
  assert.equal(v1.reused, 0, "nothing stored yet");
  const list = await call("studio", { action: "listWearables" }, studioToken);
  const item = list.body.wearables.find((w) => w.pack_id === PACK);
  const fitA = item.versions[0].fits.find((f) => f.character_id === CHAR_A);
  const k = 96 / 232;
  assert.ok(Math.abs(fitA.site.x - ((96 - 224 * k) / 2 + 60 * k)) < 1e-3);
  assert.ok(Math.abs(fitA.site.y - 10 * k) < 1e-3);
  assert.equal(fitA.placement.group, "head");
  assert.ok(fitA.files.front && fitA.files.preview);
});

test("an unapproved version can't become a website visual", async () => {
  const r = await call("admin", { action: "studioWearableVisual", versionId: v1.versionId }, adminToken);
  assert.equal(r.status, 409);
});

test("approve v1, then a rejected v2 leaves v1 approved", async () => {
  assert.equal((await call("admin", { action: "studioWearableReview", versionId: v1.versionId, decision: "approve" }, adminToken)).status, 200);
  v2 = await publish([40, 40, 200, 255]);
  assert.equal(v2.version, 2);
  assert.equal(v2.reused, 1, "the unchanged preview is reused, not uploaded again");
  const noNote = await call("admin", { action: "studioWearableReview", versionId: v2.versionId, decision: "reject" }, adminToken);
  assert.equal(noNote.status, 400, "a rejection needs a note");
  const rej = await call("admin", { action: "studioWearableReview", versionId: v2.versionId, decision: "reject", note: "Too blue" }, adminToken);
  assert.equal(rej.status, 200);
  const item = (await rest(`studio_wearables?pack_id=eq.${PACK}`)).body[0];
  assert.equal(item.latest_version, 2);
  assert.equal(item.approved_version, 1);
});

test("the approved version becomes a wearable; tampered or unapproved art is refused", async () => {
  const built = await call("admin", { action: "studioWearableVisual", versionId: v1.versionId }, adminToken);
  assert.equal(built.status, 200, JSON.stringify(built.body));
  assert.deepEqual(built.body.compatibleCharacters, [SITE_A]);
  assert.deepEqual(built.body.unmatched, [CHAR_B]);
  assert.equal(built.body.visual.layer, "hat");
  const wearable = {
    id: WEAR, name: "Test cap", type: built.body.visual.layer, pack: "wild", rarity: "common",
    compatible_characters: built.body.compatibleCharacters, visual: built.body.visual, studio: built.body.studio, published: false,
  };
  const ok = await call("admin", { action: "saveWearable", wearable }, adminToken);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(ok.body.wearable.studio, { pack: PACK, slot: "hat", item: "test_cap", version: 1 });
  assert.equal(ok.body.wearable.visual.x, built.body.visual.x);

  const tampered = { ...wearable, visual: { ...wearable.visual, image: "https://example.com/other.png" } };
  assert.equal((await call("admin", { action: "saveWearable", wearable: tampered }, adminToken)).status, 400);
  const rejected = { ...wearable, studio: { ...wearable.studio, version: 2 } };
  assert.equal((await call("admin", { action: "saveWearable", wearable: rejected }, adminToken)).status, 400);
  // the saved wearable still holds version 1's art
  const row = (await rest(`wearables?id=eq.${WEAR}`)).body[0];
  assert.equal(row.studio.version, 1);
  assert.equal(row.visual.image, built.body.visual.image);
});

test("a back-only wearable validates (no front image)", async () => {
  const built = await call("admin", { action: "studioWearableVisual", versionId: v1.versionId }, adminToken);
  const v = { ...built.body.visual, image: null, backImage: built.body.visual.image };
  const r = await call(
    "admin",
    { action: "saveWearable", wearable: { id: WEAR, name: "Test cap", type: "backpack", pack: "wild", rarity: "common", compatible_characters: [SITE_A], visual: { ...v, layer: "backpack" }, studio: built.body.studio } },
    adminToken,
  );
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.wearable.visual.image, null);
});
