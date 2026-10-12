// Myths Reimagined pack art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
// Four figures from public-domain mythology (Egyptian, Greek and Chinese),
// redrawn as Fuchey companions on the shared body frame, and a wardrobe of
// temple gold that fits all of them. Original designs made for Fuchey.

import { INK, arc, bodyParts, box, cheeks, ell, eyes, flat, FRAME, mirror, poly, pts, solid, star, stroke, tube, wearable } from "./vectorKit.js";

const GOLD = { b: "#ffc93c", l: "#fff0a0", d: "#d99a14" };
const LINEN = { b: "#fbf6e9", l: "#ffffff", d: "#ddd3b8" };
const TURQ = "#2fb8b0";

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

// Anubis: a black jackal with tall gold-lined ears, kohl-rimmed eyes, a broad
// gold collar and a white linen kilt.
function anubis() {
  const fur = { b: "#34304a", l: "#565075", d: "#1f1c2e" };
  const earL = [[29, 24], [30.5, -5], [44, 15.5]];
  const innerL = [[31.5, 19.5], [32.3, 2], [40.5, 15]];
  return [
    ...solid(poly(earL), fur, { shine: false }),
    ...flat(poly(innerL), GOLD.b),
    ...solid(poly(mirror(earL)), fur, { shine: false }),
    ...flat(poly(mirror(innerL)), GOLD.b),
    ...bodyParts({ fur, feet: GOLD }),
    ...solid(poly([[32.6, 70], [63.4, 70], [65, 81.5], [31, 81.5]]), LINEN, { shine: false }),
    ...stroke("M42 72L41 81M48 72L48 81.5M54 72L55 81", { color: LINEN.d, sw: 0.8 }),
    ...solid(box(32.4, 68.5, 63.6, 72, 1), GOLD, { shine: false }),
    ...solid(poly([...arc(48, 55, 14, 9.5, 0, 180, 16), ...arc(48, 55, 7.5, 4.2, 180, 0, 10)]), GOLD, { shine: false }),
    ...stroke("M39.6 56.4Q48 64.6 56.4 56.4", { color: TURQ, sw: 1.4 }),
    ...solid(FRAME.head, fur),
    ...solid(ell(48, 45.5, 10.5, 7.2), { b: "#4d476b", l: "#6e6890", d: "#2f2b45" }),
    ...eyes({ y: 32 }),
    ...[39, 57].flatMap((x) => stroke(`M${x - 5.6} 31Q${x} 25.6 ${x + 5.6} 31L${x + (x < 48 ? -8 : 8)} 30`, { color: GOLD.b, sw: 1.1 })),
    ...stroke("M35.5 38.6L33 42.5M60.5 38.6L63 42.5", { color: GOLD.b, sw: 1.1 }),
    ...flat(ell(48, 41.8, 3.2, 2.3), INK),
    ...flat(ell(47, 41.1, 1, 0.6), "#ffffff", { op: 0.7 }),
    ...stroke("M43.5 48.2Q48 51.6 52.5 48.2"),
  ];
}

// Medusa: a mint-skinned gorgon whose hair is a nest of friendly little
// snakes, in a white chiton with a gold band.
function medusa() {
  const skin = { b: "#c8efd2", l: "#ecfff1", d: "#98d1aa" };
  const scale = { b: "#4fbf6a", l: "#8ee6a0", d: "#2f8f49" };
  const snakes = [
    ["M29 25C21 17 14 20 13 27", [13, 28]],
    ["M36 16C32 7 25 4 21 7", [20.5, 7.5]],
    ["M45 13C45 4 41 -1 36 -1", [35.5, -1]],
    ["M25 36C17 38 13 45 15 51", [15, 52]],
  ];
  const head = ([x, y]) => [
    ...solid(ell(x, y, 3.6, 3), scale, { shine: false }),
    ...flat(ell(x - 1.2, y - 0.6, 0.7), INK),
    ...flat(ell(x + 1.2, y - 0.6, 0.7), INK),
    ...stroke(`M${x} ${y + 2.6}L${x} ${y + 4.2}M${x} ${y + 4.2}L${x - 0.8} ${y + 5}M${x} ${y + 4.2}L${x + 0.8} ${y + 5}`, { color: "#e8384f", sw: 0.6 }),
  ];
  const mirrorD = (d) => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x, y) => `${96 - Number(x)} ${y}`);
  const cap = poly([...arc(48, 32.5, 26.5, 22.5, 180, 360, 24), [74, 32], [70, 27], [66, 29], [61, 24], [55, 27.5], [48, 23.5], [41, 27.5], [35, 24], [30, 29], [26, 27], [22, 32]]);
  return [
    ...snakes.flatMap(([d, h]) => [...tube(d, scale.b, 3.2), ...head(h)]),
    ...snakes.flatMap(([d, [x, y]]) => [...tube(mirrorD(d), scale.b, 3.2), ...head([96 - x, y])]),
    ...bodyParts({ fur: LINEN, hands: skin, legs: skin, feet: GOLD }),
    ...solid(poly([[32.6, 70], [63.4, 70], [66, 82], [30, 82]]), LINEN, { shine: false }),
    ...stroke("M40 72L38.5 81.5M48 72L48 82M56 72L57.5 81.5", { color: LINEN.d, sw: 0.8 }),
    ...solid(box(32.4, 67, 63.6, 70.5, 1), GOLD, { shine: false }),
    ...solid(FRAME.head, skin),
    ...eyes({ y: 34, rx: 4.2, ry: 5.2, look: [-0.8, 0.6] }),
    ...stroke("M33 27.4Q39 25 44 27.6", { color: scale.d, sw: 1.2 }),
    ...stroke("M52 27.6Q57 25 63 27.4", { color: scale.d, sw: 1.2 }),
    ...stroke("M43.5 46Q48 49.6 52.5 46"),
    ...flat(poly([[46.5, 47.2], [47.6, 47.6], [47, 49.4]]), "#ffffff", { line: true }),
    ...cheeks(43, "#ff9cb4"),
    ...solid(cap, scale, { shine: false }),
    ...stroke("M33 19Q48 12.5 63 19", { color: scale.l, sw: 1.4 }),
  ];
}

// Monkey King: a golden monkey with a peach heart-shaped face, a gold
// circlet, a curling tail and a tiger-skin kilt.
function monkeyKing() {
  const fur = { b: "#c98a4b", l: "#e8b27a", d: "#9a6330" };
  const peach = { b: "#ffdcb8", l: "#fff1e0", d: "#eab48a" };
  const tiger = { b: "#ff9d2e", l: "#ffc477", d: "#d97616" };
  const face = [[48, 24], [55.5, 19.5], [64, 23], [67.5, 32.5], [64, 45], [56, 52], [48, 53.5], [40, 52], [32, 45], [28.5, 32.5], [32, 23], [40.5, 19.5]];
  const tail = "M60 78C74 79 83 71 83 60C83 51 74 49 72 55C70.5 60 76 62 78 58";
  return [
    ...tube(tail, fur.b, 3.4),
    ...solid(ell(22, 34, 5.5, 6.5), fur, { shine: false }),
    ...flat(ell(22.6, 34.4, 3, 4), peach.d),
    ...solid(ell(74, 34, 5.5, 6.5), fur, { shine: false }),
    ...flat(ell(73.4, 34.4, 3, 4), peach.d),
    ...bodyParts({ fur, hands: peach, feet: peach }),
    ...solid(poly([[32.6, 70.5], [63.4, 70.5], [65.5, 82], [58, 80], [52, 83], [44, 80.5], [37, 83], [30.5, 81.5]]), tiger, { shine: false }),
    ...stroke("M38 72L40 76.5M47 71.5L46 76M55 72L57.5 77M60 75L62 79.5M34.5 75L36 79", { sw: 1.4 }),
    ...solid(FRAME.head, fur),
    ...solid(pts(face), peach),
    ...eyes({ y: 34, rx: 4.2, ry: 5.2 }),
    ...flat(ell(46, 42, 0.8, 0.6), peach.d),
    ...flat(ell(50, 42, 0.8, 0.6), peach.d),
    ...flat(pts([[41.5, 45], [54.5, 45], [52, 49.5], [48, 51], [44, 49.5]]), "#8a2b3a"),
    ...flat(poly([[43, 45.2], [53, 45.2], [52.2, 46.8], [43.8, 46.8]]), "#ffffff"),
    ...stroke("M41.5 45Q48 46 54.5 45", { sw: 1.1 }),
    ...cheeks(44),
    ...tube("M25.5 25Q48 13.5 70.5 25", GOLD.b, 2.6),
    ...solid(ell(25, 25.6, 2.2), GOLD, { shine: false }),
    ...solid(ell(71, 25.6, 2.2), GOLD, { shine: false }),
    ...solid(poly([[48, 13.6], [50.6, 17.4], [48, 21], [45.4, 17.4]]), { b: "#e8384f", l: "#ff8a96", d: "#b8223a" }, { shine: false }),
  ];
}

// Minotaur: a chestnut bull with ivory horns, a pink muzzle, a gold nose
// ring and a bronze-studded belt.
function minotaur() {
  const fur = { b: "#9a5a36", l: "#c07d52", d: "#6e3c20" };
  const ivory = { b: "#fff3d6", l: "#ffffff", d: "#e2cf9e" };
  const muzzle = { b: "#f2b6a6", l: "#ffd8cd", d: "#d68c7b" };
  const hornL = [[31, 21], [21, 20], [14, 13], [12.5, 4], [17, 9], [23, 13.5], [33, 15.5]];
  return [
    ...solid(pts(hornL), ivory, { shine: false }),
    ...solid(pts(mirror(hornL)), ivory, { shine: false }),
    ...solid(ell(21.5, 31, 6, 3.2), fur, { shine: false }),
    ...solid(ell(74.5, 31, 6, 3.2), fur, { shine: false }),
    ...bodyParts({ fur, hands: fur, feet: { b: "#3b2a22", l: "#5a4236", d: "#241812" }, belly: { b: "#c98c64", l: "#e2ab86", d: "#a46a45" } }),
    ...solid(box(32.4, 72, 63.6, 76, 1.2), { b: "#7a4a2a", l: "#9a6a44", d: "#55301a" }, { shine: false }),
    ...[37, 43, 48, 53, 59].flatMap((x) => solid(ell(x, 74, 1.1), GOLD, { shine: false })),
    ...solid(FRAME.head, fur),
    ...solid(pts([[41, 15], [45, 11.5], [48, 14], [51.5, 11], [55.5, 15], [53, 20.5], [48, 18.5], [43, 20.5]]), { b: "#5a321c", l: "#7a4a2e", d: "#3e2110" }, { shine: false }),
    ...eyes({ y: 31.5, rx: 4, ry: 4.8 }),
    ...stroke("M33.5 25.5Q39 23 43.5 26.5M52.5 26.5Q57 23 62.5 25.5", { sw: 1.6 }),
    ...solid(ell(48, 45, 12.5, 8.2), muzzle),
    ...flat(ell(43.5, 44, 1.8, 2.4), INK),
    ...flat(ell(52.5, 44, 1.8, 2.4), INK),
    ...tube("M45.4 48.6Q48 55.4 50.6 48.6", GOLD.b, 1.5),
    ...stroke("M41 50.5Q43 52 44.5 51M55 50.5Q53 52 51.5 51", { sw: 1 }),
  ];
}

export const mythsCharacters = {
  anubis: { shapes: anubis() },
  medusa: { shapes: medusa() },
  "monkey-king": { shapes: monkeyKing() },
  minotaur: { shapes: minotaur() },
};

// ---------------------------------------------------------------------------
// Wardrobe
// ---------------------------------------------------------------------------

// Laurel Wreath: two gold laurel branches that wrap around the head from
// the temples and meet at the front of the crown.
function laurelWreath() {
  const leaf = (x, y, a, s = 1) => {
    const t = (dx, dy) => [x + (dx * Math.cos(a) - dy * Math.sin(a)) * s, y + (dx * Math.sin(a) + dy * Math.cos(a)) * s];
    return pts([t(0, 0), t(1.6, -2.2), t(4.6, -1.4), t(6.2, 0), t(4.6, 1.4), t(1.6, 2.2)]);
  };
  // The branch follows an ellipse just outside the head: angle 270 is the
  // front of the crown, 180 / 360 the temples.
  const at = (deg) => {
    const r = (deg * Math.PI) / 180;
    return [48 + Math.cos(r) * 26.5, 27 + Math.sin(r) * 13.5];
  };
  const branch = (from, to) => {
    const out = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const deg = from + ((to - from) * i) / steps;
      const [x, y] = at(deg);
      const [nx, ny] = at(deg + (to > from ? 1 : -1));
      const dir = Math.atan2(ny - y, nx - x) + Math.PI;
      const s = 0.85 + 0.25 * (i / steps);
      out.push(...solid(leaf(x, y, dir - 0.75, s), GOLD, { shine: false }), ...solid(leaf(x, y, dir + 0.75, s), GOLD, { shine: false }));
    }
    return out;
  };
  const stem = (from, to) => {
    const pts2 = Array.from({ length: 13 }, (_, i) => at(from + ((to - from) * i) / 12));
    return stroke(`M${pts2.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}`, { color: GOLD.d, sw: 1.4 });
  };
  return wearable({
    front: [
      ...stem(262, 178),
      ...stem(278, 362),
      ...branch(178, 262),
      ...branch(362, 278),
      ...solid(ell(48, 13.6, 2.2), { b: "#e8384f", l: "#ff8a96", d: "#b8223a" }, { shine: false }),
    ],
  });
}

// Pharaoh Nemes: a blue-and-gold striped headcloth with a gold cobra.
function pharaohNemes() {
  const blue = { b: "#2e5fbf", l: "#5c86dc", d: "#1e418c" };
  const lappet = [[23.5, 25], [30.5, 29], [32, 58], [21, 60], [17.5, 44]];
  const stripes = (x0, x1) => stroke(`M${x0} 33L${x1} 33M${x0 - 0.5} 40L${x1 + 0.6} 40M${x0 - 1} 47L${x1 + 1} 47M${x0 - 1.5} 54L${x1 + 1.4} 54`, { color: GOLD.b, sw: 1.6 });
  return wearable({
    back: [...solid(poly([[20, 30], [76, 30], [80, 60], [16, 60]]), blue, { shine: false })],
    front: [
      ...solid(pts(lappet), blue, { shine: false }),
      ...stripes(20, 30.5),
      ...solid(pts(mirror(lappet)), blue, { shine: false }),
      ...stripes(65.5, 76),
      ...solid(pts([[23, 27.5], [26.5, 15.5], [37, 9.5], [48, 8], [59, 9.5], [69.5, 15.5], [73, 27.5], [48, 24.5]]), blue),
      ...stroke("M27 19.5Q48 14 69 19.5M25 24Q48 19 71 24", { color: GOLD.b, sw: 1.6 }),
      ...stroke("M36 11L35 23M42.5 9L42 22.5M53.5 9L54 22.5M60 11L61 23", { color: GOLD.b, sw: 1.4 }),
      ...solid(box(24, 24.5, 72, 28.2, 1.4), GOLD, { shine: false }),
      ...solid(pts([[48, 13], [51, 17], [50, 23], [48, 24.5], [46, 23], [45, 17]]), GOLD, { shine: false }),
      ...flat(ell(48, 17, 0.9), "#e8384f"),
    ],
  });
}

// Olympian Toga: a white drape over one shoulder with a gold hem.
function olympianToga() {
  return wearable({
    front: [
      ...solid(pts([[33, 59], [63, 59], [63.6, 75], [57, 82], [39, 82], [32.4, 75]]), LINEN, { shine: false }),
      ...solid(poly([[36, 55], [45, 55], [64, 76], [64, 81.5], [58, 81.5]]), { b: "#ffffff", l: "#ffffff", d: "#e6dfcc" }, { shine: false }),
      ...stroke("M45 57.5L60 74M41 59L55 76", { color: LINEN.d, sw: 0.8 }),
      ...tube("M32.8 80Q48 84.2 63.2 80", GOLD.b, 1.6),
      ...solid(ell(40.5, 57, 2.4), GOLD, { shine: false }),
    ],
  });
}

// Ankh Amulet: a gold ankh on a turquoise-beaded chain.
function ankhAmulet() {
  return wearable({
    front: [
      ...stroke("M38.5 55.5Q48 64 57.5 55.5", { color: GOLD.d, sw: 1.2 }),
      ...[40.5, 44, 52, 55.5].map((x) => ({ x, y: x < 48 ? 57.4 + (x - 40.5) * 0.4 : 57.4 + (55.5 - x) * 0.4 })).flatMap(({ x, y }) => flat(ell(x, y + 0.6, 1.1), TURQ, { line: true })),
      ...tube("M48 66.4C45 66.4 44.6 60.6 48 60.6C51.4 60.6 51 66.4 48 66.4", GOLD.b, 1.7),
      ...tube("M43.6 67.2L52.4 67.2", GOLD.b, 1.7),
      ...tube("M48 67.2L48 74.4", GOLD.b, 1.9),
    ],
  });
}

// Golden Trident: a three-pronged spear held in the right hand.
function goldenTrident() {
  const prong = (x) => poly([[x - 1.1, 39], [x - 1.1, 27], [x, 23], [x + 1.1, 27], [x + 1.1, 39]]);
  return wearable({
    front: [
      ...tube("M69 92L69 38", "#c98a3a", 2),
      ...solid(pts([[60.5, 36], [61.5, 40.5], [69, 42.5], [76.5, 40.5], [77.5, 36], [74, 38.6], [64, 38.6]]), GOLD, { shine: false }),
      ...solid(prong(61.2), GOLD, { shine: false }),
      ...solid(prong(69), GOLD, { shine: false }),
      ...solid(prong(76.8), GOLD, { shine: false }),
    ],
  });
}

// Aegis Shield: a round bronze shield slung across the back, peeking out
// past the left side, with a studded rim and a gold owl-eye boss.
function aegisShield() {
  const bronze = { b: "#d08a3c", l: "#f2b46c", d: "#a3641f" };
  const cx = 28;
  const cy = 66;
  return wearable({
    back: [
      ...solid(ell(cx, cy, 17, 17), bronze),
      ...flat(ell(cx, cy, 12.5, 12.5), "none", { line: true }),
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return flat(ell(cx + Math.cos(a) * 14.8, cy + Math.sin(a) * 14.8, 1), bronze.d);
      }).flat(),
      ...solid(ell(cx, cy, 4.5), GOLD, { shine: false }),
    ],
    front: [...tube("M37 56L59 79", "#7a4a2a", 1.8)],
  });
}

// Olympus Clouds: soft clouds around the feet and a few gold sparks.
function olympusClouds() {
  const cloud = { b: "#ffffff", l: "#ffffff", d: "#d8e2f4" };
  const puff = (x, y, s) => [ell(x, y, 6 * s, 4.5 * s), ell(x + 5 * s, y - 2 * s, 5 * s, 4.5 * s), ell(x + 10 * s, y, 6 * s, 4.5 * s)];
  return wearable({
    back: [
      ...puff(14, 86, 1.1).flatMap((e) => solid(e, cloud, { shine: false })),
      ...puff(64, 87, 1.1).flatMap((e) => solid(e, cloud, { shine: false })),
      ...puff(4, 40, 0.8).flatMap((e) => solid(e, cloud, { shine: false })),
      ...puff(78, 22, 0.8).flatMap((e) => solid(e, cloud, { shine: false })),
    ],
    front: [
      ...puff(26, 91, 0.9).flatMap((e) => solid(e, cloud, { shine: false })),
      ...puff(54, 92, 0.8).flatMap((e) => solid(e, cloud, { shine: false })),
      ...flat(star(12, 16, 5), GOLD.b, { line: true }),
      ...flat(star(87, 48, 4.4), GOLD.b, { line: true }),
      ...flat(star(88, 6, 3.6), GOLD.b, { line: true }),
    ],
  });
}

export const mythsWearables = {
  "laurel-wreath": laurelWreath(),
  "pharaoh-nemes": pharaohNemes(),
  "olympian-toga": olympianToga(),
  "ankh-amulet": ankhAmulet(),
  "golden-trident": goldenTrident(),
  "aegis-shield": aegisShield(),
  "olympus-clouds": olympusClouds(),
};
