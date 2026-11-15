// End-to-end checks of the admin-managed home content (drops, hero slides,
// home settings) against a running Supabase (local: `npx supabase start`,
// then `npx supabase functions serve`).
//
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
//     node --test supabase/tests/content.test.mjs
//
// Uses a throwaway ed25519 admin wallet and cleans up everything it creates.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bs58 from "bs58";

const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");

const DROP = `test-drop-${Date.now().toString(36)}`;
const SLIDE = `${DROP}-slide`;
const CUSTOM = `${DROP}-custom`;

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

async function call(body, token) {
  const response = await fetch(`${URL_}/functions/v1/admin`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(token ? { "x-fuchey-session": token } : {}) },
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

const admin = wallet();
const stranger = wallet();
let token;
let settingsBefore;

const drop = (over = {}) => ({
  id: DROP,
  pack: "tribal",
  title: "Tribal Pack Drop",
  label: "Coming Soon",
  headline: "Masks, feathers",
  headline_accent: "and old magic.",
  tagline: "Warriors and mystics from the deep jungle.",
  character_ids: ["warrior", "shaman"],
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  live: false,
  sort_order: 50,
  ...over,
});

before(async () => {
  const r = await rest("admins", { key: SERVICE, method: "POST", body: JSON.stringify({ wallet: admin.address }) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  token = session(admin, "admin");
  settingsBefore = (await rest("site_settings?key=eq.home")).body?.[0]?.value;
});

after(async () => {
  await rest(`home_slides?id=in.(${SLIDE},${CUSTOM})`, { key: SERVICE, method: "DELETE" });
  await rest(`drops?id=eq.${DROP}`, { key: SERVICE, method: "DELETE" });
  if (settingsBefore) {
    await rest("site_settings?key=eq.home", { key: SERVICE, method: "PATCH", body: JSON.stringify({ value: settingsBefore }) });
  }
  await rest(`admins?wallet=eq.${admin.address}`, { key: SERVICE, method: "DELETE" });
});

test("the seeded Pirate drop, its hero slide and home settings are public", async () => {
  const d = await rest("drops?id=eq.pirate-pack");
  assert.equal(d.status, 200);
  assert.equal(d.body.length, 1);
  assert.deepEqual(d.body[0].character_ids, ["squidman", "captain", "zombie-pirate"]);
  const s = await rest("home_slides?select=id,kind&order=sort_order");
  assert.ok(s.body.some((x) => x.kind === "scratch"));
  const h = await rest("site_settings?key=eq.home");
  assert.equal(typeof h.body[0].value.autoplaySeconds, "number");
});

test("anon can't write drops, slides or settings", async () => {
  const r = await rest("drops", { method: "POST", body: JSON.stringify(drop()) });
  assert.ok(r.status >= 400, `expected a refusal, got ${r.status}`);
  const s = await rest("site_settings?key=eq.home", { method: "PATCH", body: JSON.stringify({ value: {} }) });
  const after_ = await rest("site_settings?key=eq.home");
  assert.ok(s.status >= 400 || after_.body[0].value.autoplaySeconds != null, "settings unchanged");
});

test("a wallet that isn't an admin is refused", async () => {
  const r = await call({ action: "listContent" }, session(stranger, "admin"));
  assert.equal(r.status, 403);
});

test("validation rejects bad drops with every problem listed", async () => {
  const r = await call({ action: "saveDrop", drop: drop({ id: "Bad ID", pack: "nope", character_ids: ["ghost"], ends_at: new Date(0).toISOString() }) }, token);
  assert.equal(r.status, 400);
  const details = r.body.details.join("\n");
  assert.match(details, /id:/);
  assert.match(details, /pack:/);
  assert.match(details, /character_ids: unknown character “ghost”/);
  assert.match(details, /ends_at: must be after the start/);
});

test("a draft drop is saved but hidden until it goes live", async () => {
  const saved = await call({ action: "saveDrop", drop: drop() }, token);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.drop.live, false);
  assert.equal((await rest(`drops?id=eq.${DROP}`)).body.length, 0, "draft is not public");

  const listed = await call({ action: "listContent" }, token);
  assert.ok(listed.body.drops.some((d) => d.id === DROP), "admin sees the draft");

  const live = await call({ action: "saveDrop", drop: drop({ live: true }) }, token);
  assert.equal(live.status, 200);
  const pub = await rest(`drops?id=eq.${DROP}`);
  assert.equal(pub.body.length, 1, "live drop is public");
  assert.equal(pub.body[0].pack, "tribal");
});

test("hero slides: a drop slide needs a real drop, custom slides need a title, order is saved", async () => {
  const bad = await call({ action: "saveSlide", slide: { id: SLIDE, kind: "drop", drop_id: "no-such-drop" } }, token);
  assert.equal(bad.status, 400);
  assert.match(bad.body.details.join("\n"), /drop_id: pick a drop/);

  const ok = await call({ action: "saveSlide", slide: { id: SLIDE, kind: "drop", drop_id: DROP, sort_order: 90 } }, token);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));

  const noTitle = await call({ action: "saveSlide", slide: { id: CUSTOM, kind: "custom" } }, token);
  assert.equal(noTitle.status, 400);
  const custom = await call({ action: "saveSlide", slide: { id: CUSTOM, kind: "custom", title: "Hello", cta_href: "/marketplace", enabled: false } }, token);
  assert.equal(custom.status, 200, JSON.stringify(custom.body));
  assert.equal((await rest(`home_slides?id=eq.${CUSTOM}`)).body.length, 0, "disabled slide is hidden");

  const order = await call({ action: "orderSlides", ids: [CUSTOM, SLIDE] }, token);
  assert.equal(order.status, 200);
  const rows = (await rest(`home_slides?id=in.(${SLIDE},${CUSTOM})&select=id,sort_order`, { key: SERVICE })).body;
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.id, r.sort_order])), { [CUSTOM]: 0, [SLIDE]: 1 });
});

test("deleting a drop removes its hero slide", async () => {
  const del = await call({ action: "deleteDrop", id: DROP }, token);
  assert.equal(del.status, 200);
  assert.equal((await rest(`home_slides?id=eq.${SLIDE}`, { key: SERVICE })).body.length, 0);
});

test("home settings are validated and saved", async () => {
  const r = await call({ action: "saveHomeSettings", settings: { autoplaySeconds: 9, sections: { parade: false, junk: true } } }, token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.settings.autoplaySeconds, 9);
  assert.equal(r.body.settings.sections.parade, false);
  assert.equal(r.body.settings.sections.stats, true);
  assert.equal("junk" in r.body.settings.sections, false);
  const bad = await call({ action: "saveHomeSettings", settings: { autoplaySeconds: 500 } }, token);
  assert.equal(bad.status, 400);
});

test("parade and Characters-page picks are character ids checked against the table", async () => {
  const settings = {
    autoplaySeconds: 7,
    parade: { characterIds: ["captain", "yeti", "captain"], seconds: 45 },
    showcase: { defaultPack: "pirates", packs: { pirates: ["squidman", "captain"], wild: [] } },
  };
  const r = await call({ action: "saveHomeSettings", settings }, token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.settings.parade, { characterIds: ["captain", "yeti"], seconds: 45 });
  assert.deepEqual(r.body.settings.showcase, { defaultPack: "pirates", packs: { pirates: ["squidman", "captain"] } });
  const pub = await rest("site_settings?key=eq.home", { key: ANON });
  assert.deepEqual(pub.body[0].value.parade.characterIds, ["captain", "yeti"]);

  const bad = await call({ action: "saveHomeSettings", settings: { parade: { characterIds: ["nobody"] }, showcase: { packs: { atlantis: [] } } } }, token);
  assert.equal(bad.status, 400);
  const text = JSON.stringify(bad.body);
  assert.match(text, /nobody/);
  assert.match(text, /atlantis/);

  // Put the defaults back for the local site.
  await call({ action: "saveHomeSettings", settings: { autoplaySeconds: 7 } }, token);
});
