import { canvas as baseCanvas, ellipse, erase, layer, line, paint, part as basePart, polygon, roundRect, toSprite } from "./pixel.js";

// Character art as sprite data { palette, rows }: one string per row, one
// character per pixel, "." for transparent. The renderer scales a sprite to
// fill the same 96×96 grid as the Yeti's image.
//
// The pack characters are designed below on a 48-unit grid and drawn at the
// 192×192 (shown on the same 96×96 grid as the Yeti); `anchors` (in units) says
// where their heads, eyes and hands are, so the pack gear in wearableArt.js
// fits them. Characters are drawn bare: hats, masks and weapons belong in
// the wardrobe.
//
// The Rhino (Wild pack) is vector art now: see wildArt.js.

// ---------------------------------------------------------------------------
// Pack characters: designed on a 48-unit grid, drawn at 192×192 (four
// pixels per unit) so curves, outlines, faces and shading stay crisp.
//
// Every pack character is built on one chibi body template: the same head,
// torso, arm, hand, leg and foot boxes, each drawn as its own shape with its
// own outline and shading, so body parts read clean and pack gear fits every
// character. What makes each one distinct is drawn on top: hair, beards,
// ears, tentacles, clothes and faces.
// ---------------------------------------------------------------------------

// Designed on a 48-unit grid, drawn at k = 4: a 192×192 sprite (twice the
// Yeti's 96×96), so faces, hands and the wardrobe on top stay crisp and
// readable at the size the site shows characters.
const K = 4;
const SIZE = 48 * K;
const canvas = () => baseCanvas(K);
const part = (shape) => basePart(shape, K);

// The body template. Characters may move the head's top (a taller dome) and
// their eyes; everything else is shared.
const BODY = {
  head: { x0: 10, x1: 37, y0: 5, y1: 27, r: 8 },
  torso: { x0: 14, x1: 33, y0: 27, y1: 40, r: 3 },
  armL: { x0: 9, x1: 14, y0: 28, y1: 36, r: 2.5 },
  armR: { x0: 33, x1: 38, y0: 28, y1: 36, r: 2.5 },
  handL: { x0: 9, x1: 14, y0: 34, y1: 40, r: 3 },
  handR: { x0: 33, x1: 38, y0: 34, y1: 40, r: 3 },
  legL: { x0: 16, x1: 21, y0: 37, y1: 43 },
  legR: { x0: 26, x1: 31, y0: 37, y1: 43 },
  footL: { x0: 14, x1: 21, y0: 42, y1: 45, r: 2 },
  footR: { x0: 26, x1: 33, y0: 42, y1: 45, r: 2 },
};

const box = (b, c, grow = 0) => part((q) => roundRect(q, b.x0 - grow, b.y0, b.x1 + grow, b.y1, b.r ?? 0, c));

// Shared colours
const INK = "#1b2430";
const WHITE = "#f6f0e4";
const GOLD = { b: "#f2c14e", l: "#ffe08a", d: "#c48d2c" };

function legsAndFeet(p, pants, boots, { bareL = null, bareR = null } = {}) {
  layer(p, box(BODY.legL, pants.b), pants);
  layer(p, box(BODY.legR, pants.b), pants);
  const fl = bareL ?? boots;
  const fr = bareR ?? boots;
  layer(p, box(BODY.footL, fl.b), fl);
  layer(p, box(BODY.footR, fr.b), fr);
}

function arms(p, sleeve, skin, { cuff = null } = {}) {
  for (const [arm, hand] of [[BODY.armL, BODY.handL], [BODY.armR, BODY.handR]]) {
    const a = box(arm, sleeve.b);
    layer(p, a, sleeve);
    if (cuff) p.span(arm.y1 - 1, arm.x0, arm.x1, cuff);
    layer(p, box(hand, skin.b), skin);
  }
}

// The head shape on its own canvas, for hair / bandanas that follow it.
const headShape = (head, c) => part((q) => roundRect(q, head.x0, head.y0, head.x1, head.y1, head.r, c));

// Paint the parts of a shape that pass test(x, y) as a new layer.
const clip = (shape, test, c) =>
  part((q) => {
    for (const pt of shape.px.values()) {
      const x = Math.floor(pt.x / K);
      const y = Math.floor(pt.y / K);
      if (test(x, y)) q.setPx(pt.x, pt.y, paint(c, x, y));
    }
  });

// Eyes: dark ovals with a light glint, or coloured eyes with a pupil.
function eyes(p, e, { white = null, pupil = INK, glint = "#ffffff" } = {}) {
  for (const [x0, x1] of [e.l, e.r]) {
    if (white) {
      roundRect(p, x0, e.y0, x1, e.y1, 1, white);
      const cx = Math.floor((x0 + x1) / 2);
      roundRect(p, cx, e.y0 + 1, cx + 1, e.y1 - 1, 0.8, pupil);
      p.setPx(cx * K + 1, (e.y0 + 1) * K + 1, glint);
    } else {
      roundRect(p, x0, e.y0, x1, e.y1, 1, pupil);
      p.setPx(x0 * K + 1, e.y0 * K + 1, glint);
      p.setPx(x0 * K + 2, e.y0 * K + 1, glint);
    }
  }
}

const anchorsFor = (head, e) => ({
  head: { x0: head.x0, x1: head.x1, y0: head.y0 },
  eyes: e,
  handR: [36, 37],
  handL: [11, 37],
  perch: [11, 27],
  chest: 28,
});

// Captain: red bandana, big brown beard, red coat with gold buttons.
function captain() {
  const p = canvas();
  const skin = { b: "#f1c27d", l: "#ffdcaa", d: "#d29a5a" };
  const red = { b: "#b8323a", l: "#d8525a", d: "#8a2028" };
  const beard = { b: "#6b3e26", l: "#8a5634", d: "#4a2a18" };
  const head = BODY.head;
  const e = { y0: 15, y1: 17, l: [16, 18], r: [29, 31] };

  legsAndFeet(p, { b: "#2e3442", l: "#454d60", d: "#1f2430" }, { b: "#3b2a20", l: "#5a4030", d: "#261a12" });
  const coat = box({ ...BODY.torso, x0: 13, x1: 34, y1: 41 }, red.b);
  erase(coat, (x, y) => y >= 37 && x >= 23 && x <= 24);
  layer(p, coat, red);
  p.span(35, 14, 33, "#3b2a20");
  p.span(36, 14, 33, "#3b2a20");
  roundRect(p, 21, 34, 26, 37, 1, GOLD.b);
  p.rect(23, 35, 24, 36, "#3b2a20");
  [30, 33].forEach((y) => [18, 29].forEach((x) => p.rect(x, y, x + 1, y + 1, GOLD.b)));
  arms(p, red, skin, { cuff: GOLD.b });

  const h = headShape(head, skin.b);
  layer(p, h, skin);
  // Bandana over the top of the head, knotted on the right
  layer(p, clip(h, (x, y) => y <= 11, red.b), red);
  layer(p, part((q) => {
    roundRect(q, 35, 7, 40, 12, 2, red.b);
    line(q, 39, 12, 42, 17, red.b);
    line(q, 40, 12, 43, 16, red.b);
  }), red);
  p.span(9, 13, 34, "#d8525a");
  [16, 22, 28].forEach((x) => p.rect(x, 7, x + 1, 8, WHITE));
  // Brows, eyes, nose
  p.span(13, 15, 19, beard.d);
  p.span(13, 28, 32, beard.d);
  eyes(p, e);
  p.rect(23, 18, 24, 19, skin.d);
  // Beard and moustache over the chin and the top of the coat
  layer(p, beardPart(beard), beard);
  p.span(23, 21, 26, "#3a1e10");
  p.span(21, 18, 22, beard.l);
  p.span(21, 25, 29, beard.l);
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

function beardPart(beard) {
  const q = canvas();
  roundRect(q, 13, 20, 34, 31, 7, beard.b);
  roundRect(q, 18, 27, 29, 34, 5, beard.b);
  erase(q, (x, y) => y === 20 && x % 3 === 0);
  return q;
}

// Squidman: a purple squid dome with big yellow eyes and tentacles hanging
// over a navy coat.
function squidman() {
  const p = canvas();
  const purple = { b: "#8e5cc2", l: "#b388e0", d: "#6a3f99" };
  const navy = { b: "#2e4a7d", l: "#4a6aa3", d: "#1e3358" };
  const head = { ...BODY.head, y0: 1, r: 12 };
  const e = { y0: 12, y1: 17, l: [15, 20], r: [27, 32] };

  legsAndFeet(p, { b: "#232a3d", l: "#343e58", d: "#161b28" }, { b: "#3b2a20", l: "#5a4030", d: "#261a12" });
  layer(p, box(BODY.torso, navy.b), navy);
  p.rect(23, 29, 24, 40, navy.d);
  [31, 35].forEach((y) => [20, 27].forEach((x) => p.rect(x, y, x + 1, y + 1, GOLD.b)));
  arms(p, navy, purple, { cuff: GOLD.b });

  layer(p, headShape(head, purple.b), purple);
  [[17, 5, 2], [27, 4, 1.6], [32, 9, 1.4], [13, 10, 1.2], [22, 7, 1]].forEach(([x, y, r]) =>
    ellipse(p, x, y, r, r, "#c49be8"),
  );
  p.span(11, 15, 20, purple.d);
  p.span(11, 27, 32, purple.d);
  eyes(p, e, { white: "#fff3a0" });
  // Tentacles: each its own shape, curling out at the tip
  [[14, 28, -1], [19, 31, -1], [23, 32, 0], [27, 31, 1], [32, 28, 1]].forEach(([x, end, curl]) => {
    const t = part((q) => {
      q.rect(x, 20, x + 2, end, purple.b);
      if (curl) q.rect(x + (curl < 0 ? -1 : 3), end - 1, x + (curl < 0 ? -1 : 3), end, purple.b);
      q.rect(x + 1 - (curl < 0 ? 1 : 0), end + 1, x + 1, end + 1, purple.b);
    });
    layer(p, t, purple);
    for (let y = 23; y < end; y += 3) p.set(x + 1, y, "#e3b8f2");
  });
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

// Zombie Pirate: grey-green skin, one big eye, a stitched cheek, a toothy
// grin, a striped shirt in tatters and one bare foot.
function zombiePirate() {
  const p = canvas();
  const skin = { b: "#9db88a", l: "#bcd4aa", d: "#6f8a5e" };
  const red = { b: "#c8443c", l: "#e06a5e", d: "#962c26" };
  const shirt = { b: "#e9e4d4", l: "#ffffff", d: "#c4bea8" };
  const head = BODY.head;
  const e = { y0: 13, y1: 18, l: [15, 20], r: [28, 31] };

  legsAndFeet(p, { b: "#4a3b2e", l: "#62503f", d: "#33281f" }, { b: "#3b2a20", l: "#5a4030", d: "#261a12" }, { bareL: skin });
  // Blue stripes are their own colour, so shading only touches the cream
  const torso = part((q) => roundRect(q, BODY.torso.x0, BODY.torso.y0, BODY.torso.x1, BODY.torso.y1, BODY.torso.r, (x, y) => (y >= 28 && y % 4 < 2 ? "#3a5a8c" : shirt.b)));
  erase(torso, (x, y) => (y === 40 && x % 3 === 0) || (y === 39 && x % 6 === 1));
  layer(p, torso, shirt);
  // Short striped sleeves, bare green forearms
  for (const [arm, hand] of [[BODY.armL, BODY.handL], [BODY.armR, BODY.handR]]) {
    layer(p, box(arm, skin.b), skin);
    roundRect(p, arm.x0, arm.y0, arm.x1, arm.y0 + 3, 2, (x, y) => (y % 2 ? "#3a5a8c" : shirt.b));
    layer(p, box(hand, skin.b), skin);
  }

  const h = headShape(head, skin.b);
  layer(p, h, skin);
  layer(p, clip(h, (x, y) => y <= 10, red.b), red);
  layer(p, part((q) => {
    roundRect(q, 6, 7, 11, 11, 2, red.b);
    line(q, 7, 11, 4, 17, red.b);
    line(q, 8, 11, 6, 17, red.b);
  }), red);
  // One big staring eye, one droopy one
  roundRect(p, 15, 13, 20, 18, 2, "#f7f2a0");
  p.rect(17, 15, 18, 16, INK);
  p.span(15, 28, 31, skin.d);
  p.rect(28, 16, 31, 17, INK);
  // Nose holes, stitches, grin
  p.set(22, 20, skin.d);
  p.set(25, 20, skin.d);
  line(p, 30, 21, 35, 21, "#4a3b2e");
  [31, 33, 35].forEach((x) => {
    p.set(x, 20, "#4a3b2e");
    p.set(x, 22, "#4a3b2e");
  });
  roundRect(p, 17, 23, 30, 25, 1, "#2a1a1a");
  for (let x = 18; x <= 29; x += 2) if (x !== 24) p.set(x, 23, WHITE);
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

// Warrior: black hair, red war paint, bare chest, a green loincloth on a
// gold belt, gold armbands.
function warrior() {
  const p = canvas();
  const skin = { b: "#a0623c", l: "#c07a4c", d: "#7a4a2c" };
  const hair = { b: "#2b1a12", l: "#4a3020", d: "#1a0f0a" };
  const leaf = { b: "#6b8f3a", l: "#88aa52", d: "#4f6b2a" };
  const head = BODY.head;
  const e = { y0: 15, y1: 17, l: [16, 18], r: [29, 31] };

  legsAndFeet(p, skin, skin);
  layer(p, box(BODY.torso, skin.b), skin);
  // War paint on the chest
  line(p, 17, 30, 23, 33, "#c0392b");
  line(p, 24, 33, 30, 30, "#c0392b");
  line(p, 17, 31, 23, 34, "#c0392b");
  line(p, 24, 34, 30, 31, "#c0392b");
  // Belt and loincloth
  p.span(35, 14, 33, GOLD.b);
  p.span(36, 14, 33, GOLD.d);
  [17, 22, 27, 31].forEach((x) => p.set(x, 35, "#c0392b"));
  layer(p, part((q) => polygon(q, [[18, 37], [30, 37], [28, 44], [20, 44]], leaf.b)), leaf);
  for (let x = 20; x <= 28; x += 2) p.set(x, 43, leaf.d);
  arms(p, skin, skin, { cuff: null });
  [BODY.armL, BODY.armR].forEach((a) => {
    p.span(30, a.x0, a.x1, GOLD.b);
    p.span(31, a.x0, a.x1, GOLD.d);
  });

  const h = headShape(head, skin.b);
  layer(p, h, skin);
  // Hair with a spiky fringe and side locks
  layer(p, clip(h, (x, y) => y <= 10 + (x % 4 === 0 ? 2 : x % 2) || ((x <= 12 || x >= 35) && y <= 18), hair.b), hair);
  // Face paint: two red bars on each cheek
  [20, 22].forEach((y) => {
    p.span(y, 13, 16, "#c0392b");
    p.span(y, 31, 34, "#c0392b");
  });
  p.span(13, 15, 19, hair.b);
  p.span(13, 28, 32, hair.b);
  eyes(p, e);
  p.rect(23, 18, 24, 19, skin.d);
  p.span(23, 21, 26, "#4a2416");
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

// Shaman: long white hair, a gold headband with a teal stone, white face
// paint, a goatee, a long orange robe and a staff with a glowing orb.
function shaman() {
  const p = canvas();
  const skin = { b: "#7a4a2c", l: "#96603c", d: "#5a3418" };
  const robe = { b: "#c47a2b", l: "#e09a48", d: "#9a5a1c" };
  const hair = { b: "#d6dee6", l: "#f4f8fb", d: "#9aa6b2" };
  const teal = "#2fa6a0";
  const head = BODY.head;
  const e = { y0: 16, y1: 17, l: [16, 18], r: [29, 31] };

  // Staff behind the left hand
  layer(p, part((q) => q.rect(7, 6, 8, 45, "#7a5230")), { b: "#7a5230", l: "#9a6a40", d: "#5a3a20" });
  layer(p, part((q) => ellipse(q, 7.5, 3.5, 3.5, 3.5, "#38d6ee")), { b: "#38d6ee", l: "#a8f0ff", d: "#1f9fb5" });
  p.rect(6, 8, 9, 9, GOLD.b);

  legsAndFeet(p, skin, { b: "#5a3a20", l: "#7a5230", d: "#3a2410" });
  const gown = box({ ...BODY.torso, y1: 43 }, robe.b);
  layer(p, gown, robe);
  p.span(42, 15, 32, teal);
  p.rect(23, 29, 24, 41, teal);
  [31, 35, 39].forEach((y) => {
    p.set(22, y, GOLD.b);
    p.set(25, y, GOLD.b);
  });
  for (const [arm, hand] of [[BODY.armL, BODY.handL], [BODY.armR, BODY.handR]]) {
    layer(p, box(arm, robe.b, 1), robe);
    p.span(arm.y1, arm.x0 - 1, arm.x1 + 1, teal);
    layer(p, box(hand, skin.b), skin);
  }
  const h = headShape(head, skin.b);
  layer(p, h, skin);
  layer(p, clip(h, (x, y) => y <= 9 || ((x <= 12 || x >= 35) && y <= 24), hair.b), hair);
  // Headband with a stone
  p.span(10, 11, 36, GOLD.b);
  p.span(11, 11, 36, GOLD.d);
  p.rect(23, 9, 24, 12, "#38d6ee");
  // Face: calm eyes, white paint, goatee
  eyes(p, e, { glint: skin.l });
  [17, 30].forEach((x) => p.rect(x, 19, x + 1, 21, WHITE));
  p.rect(23, 18, 24, 19, skin.d);
  p.span(23, 22, 25, skin.d);
  layer(p, part((q) => roundRect(q, 22, 25, 25, 29, 1, hair.b)), hair);
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

// Goblin: bright green, huge pointed ears, yellow slit eyes, a big nose and
// a fanged grin, in a patched brown tunic with a rope belt.
function goblin() {
  const p = canvas();
  const skin = { b: "#5fae3a", l: "#84cc5c", d: "#3f7d26" };
  const tunic = { b: "#7a5a3a", l: "#9a7650", d: "#5a4028" };
  const head = BODY.head;
  const e = { y0: 13, y1: 18, l: [15, 20], r: [27, 32] };

  legsAndFeet(p, skin, skin);
  const t = box(BODY.torso, tunic.b);
  erase(t, (x, y) => y === 40 && x % 4 === 1);
  layer(p, t, tunic);
  p.span(34, 14, 33, "#c9a24a");
  p.span(35, 14, 33, "#a07e32");
  p.rect(26, 29, 30, 32, tunic.d);
  p.set(27, 30, "#c9a24a");
  p.set(29, 31, "#c9a24a");
  arms(p, skin, skin);

  // Ears behind the head
  for (const dir of [-1, 1]) {
    const ear = part((q) => {
      const base = dir < 0 ? 12 : 35;
      polygon(q, [[base, 11], [base, 22], [base + dir * 11, 8]], skin.b);
    });
    layer(p, ear, skin);
    const base = dir < 0 ? 12 : 35;
    polygon(p, [[base - dir, 14], [base - dir, 19], [base + dir * 6, 12]], "#d98a8a");
  }
  layer(p, headShape(head, skin.b), skin);
  // Brows, slit eyes
  line(p, 14, 11, 20, 12, skin.d);
  line(p, 33, 11, 27, 12, skin.d);
  eyes(p, e, { white: "#f2d14e" });
  [17, 29].forEach((x) => p.rect(x, 14, x + 1, 17, INK));
  // Big nose and a fanged grin
  layer(p, part((q) => roundRect(q, 21, 17, 26, 21, 2, skin.b)), skin);
  roundRect(p, 16, 23, 31, 25, 1, "#2a1a1a");
  p.rect(18, 23, 19, 24, WHITE);
  p.rect(28, 23, 29, 24, WHITE);
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

// Bandit: messy brown hair, narrowed eyes, a red scarf over the face and a
// grey cloak with a gold clasp.
function bandit() {
  const p = canvas();
  const skin = { b: "#e0ac7e", l: "#f2c79c", d: "#b8845a" };
  const hair = { b: "#3d2a1e", l: "#5a4030", d: "#2a1c14" };
  const cloak = { b: "#566173", l: "#727e92", d: "#3c4555" };
  const scarf = { b: "#8a2f2f", l: "#a84444", d: "#6a2020" };
  const head = BODY.head;
  const e = { y0: 16, y1: 17, l: [16, 18], r: [29, 31] };

  legsAndFeet(p, { b: "#2b2b38", l: "#3e3e50", d: "#1c1c26" }, { b: "#6b4a2e", l: "#8a6440", d: "#4a321e" });
  // Cape behind, then the cloak
  layer(p, part((q) => roundRect(q, 8, 27, 39, 42, 4, cloak.d)), { b: cloak.d, l: cloak.b, d: "#2a3140" });
  layer(p, box(BODY.torso, cloak.b), cloak);
  p.span(35, 14, 33, "#6b4a2e");
  p.span(36, 14, 33, "#4a321e");
  p.rect(22, 34, 25, 37, GOLD.b);
  p.rect(23, 35, 24, 36, "#4a321e");
  arms(p, cloak, skin);

  const h = headShape(head, skin.b);
  layer(p, h, skin);
  layer(p, clip(h, (x, y) => y <= 10 + ((x * 7) % 5 === 0 ? 3 : (x * 3) % 4 === 0 ? 1 : 0) || ((x <= 12 || x >= 35) && y <= 17), hair.b), hair);
  // Slanted brows, narrowed eyes
  line(p, 15, 13, 19, 14, hair.d);
  line(p, 32, 13, 28, 14, hair.d);
  eyes(p, e);
  // Scarf over the lower face, wrapped round the neck, tail on the right
  layer(p, part((q) => {
    for (const pt of h.px.values()) if (pt.y >= 20 * K) q.setPx(pt.x, pt.y, scarf.b);
    roundRect(q, 13, 25, 34, 29, 2, scarf.b);
    roundRect(q, 33, 27, 37, 34, 2, scarf.b);
  }), scarf);
  p.span(23, 14, 33, scarf.d);
  p.span(27, 14, 33, scarf.d);
  p.rect(23, 29, 24, 30, GOLD.b);
  return { sprite: toSprite(p, SIZE), anchors: anchorsFor(head, e) };
}

const PACK_CHARACTERS = {
  captain: captain(),
  squidman: squidman(),
  "zombie-pirate": zombiePirate(),
  warrior: warrior(),
  shaman: shaman(),
  goblin: goblin(),
  bandit: bandit(),
};

export const sprites = {
  ...Object.fromEntries(Object.entries(PACK_CHARACTERS).map(([id, c]) => [id, c.sprite])),
};

// Where things are on each pack character, in units of its 48-unit grid:
//   head    { x0, x1, y0 } the head's box (y0 = top)
//   eyes    { y0, y1, l: [x0, x1], r: [x0, x1] }
//   handR / handL  [x, y] centre of the hand on the viewer's right / left
//   perch   [x, y] where a pet on the left shoulder grips (top of the shoulder)
//   chest   first row below the chin
export const anchors = Object.fromEntries(Object.entries(PACK_CHARACTERS).map(([id, c]) => [id, c.anchors]));
