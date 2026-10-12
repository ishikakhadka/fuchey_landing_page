// Superheroes Reimagined pack art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
// Four ORIGINAL heroes built on classic hero archetypes (the speedster, the
// flier, the armoured tank and the night watcher). They aren't based on any
// existing comic character: their names, costumes, colours and emblems are
// made for Fuchey. Keep it that way when adding to this pack: no famous
// emblems (bats, spiders, lightning-bolt chests, star shields) and no
// borrowed costumes. The wardrobe fits all four.

import { INK, arc, bodyParts, box, cheeks, ell, ellD, eyes, flat, FRAME, mirror, poly, pts, solid, star, stroke, tube, wearable } from "./vectorKit.js";

const GOLD = { b: "#ffc93c", l: "#fff0a0", d: "#d99a14" };
const WHITE = { b: "#ffffff", l: "#ffffff", d: "#dfe1ee" };
const SILVER = { b: "#c9d3e2", l: "#f0f4fa", d: "#94a1b6" };

// Determined brows and a confident grin, shared by the human heroes.
const heroFace = (brow = INK) => [
  ...eyes({ y: 34, rx: 4.2, ry: 5.2 }),
  ...stroke("M33.5 27.8L43.5 29.6M52.5 29.6L62.5 27.8", { color: brow, sw: 1.7 }),
  ...flat(pts([[43, 45.5], [53, 45.5], [51.5, 48.8], [48, 50], [44.5, 48.8]]), "#8a2b3a"),
  ...flat(poly([[44, 45.6], [52, 45.6], [51.4, 46.9], [44.6, 46.9]]), "#ffffff"),
  ...stroke("M42.5 45.4Q48 46.2 53.5 45.4", { sw: 1.1 }),
];

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

// Zippa: a speedster in a teal suit with yellow speed chevrons, gloves and
// boots, and white hair swept back by the wind.
function zippa() {
  const skin = { b: "#c98b5e", l: "#e2a97e", d: "#a2683f" };
  const hair = { b: "#f4f6ff", l: "#ffffff", d: "#c4cae0" };
  const teal = { b: "#1fb5a8", l: "#62dccf", d: "#14857b" };
  const yellow = { b: "#ffd23f", l: "#ffe98c", d: "#e0aa1c" };
  const chevron = (x) => poly([[x, 60], [x + 5, 65.5], [x, 71], [x - 3, 71], [x + 2, 65.5], [x - 3, 60]]);
  return [
    ...solid(poly([[24, 30], [10, 22], [21, 19], [8, 10], [26, 13], [22, 5], [38, 12], [48, 11], [66, 14], [74, 26]]), hair, { shine: false }),
    ...bodyParts({ fur: teal, hands: yellow, legs: teal, feet: yellow }),
    ...solid(chevron(44), yellow, { shine: false }),
    ...solid(chevron(50.5), yellow, { shine: false }),
    ...solid(box(32.4, 74, 63.6, 76.6, 1), { b: "#14857b", l: "#1fb5a8", d: "#0c5a53" }, { shine: false }),
    ...solid(FRAME.head, skin),
    ...heroFace(hair.d),
    ...cheeks(43),
    ...solid(poly([...arc(48, 32.5, 26.5, 22.5, 180, 360, 24), [74, 30], [68, 24], [62, 27], [56, 21.5], [49, 26], [42, 21], [35, 25.5], [28, 21], [22, 30]]), hair, { shine: false }),
    ...stroke("M31 17Q46 11 64 16", { color: "#ffffff", sw: 1.4 }),
    ...stroke("M6 40L14 40M4 48L13 48M7 56L14 56", { color: teal.d, sw: 1.2 }),
  ];
}

// Nimbus: a cheerful flier in sky blue with puffy cloud hair, a cloud on the
// chest and white gloves and boots.
function nimbus() {
  const skin = { b: "#ffe2cf", l: "#fff3ea", d: "#f1bd9d" };
  const sky = { b: "#5aa9ff", l: "#9ccaff", d: "#3a80d6" };
  const cloud = { b: "#ffffff", l: "#ffffff", d: "#d6e2f4" };
  const puffs = [[26, 22, 8], [34, 13, 8.5], [45, 9, 9], [56, 10, 8.5], [66, 15, 8], [72, 26, 6.5], [22, 32, 6]];
  return [
    ...puffs.flatMap(([x, y, r]) => solid(ell(x, y, r, r * 0.85), cloud, { shine: false })),
    ...bodyParts({ fur: sky, hands: WHITE, legs: sky, feet: WHITE }),
    ...solid(pts([[41, 69], [42, 64.5], [45.5, 63.5], [48, 60.5], [52, 61.5], [54, 64.5], [56, 66], [55, 69]]), cloud, { shine: false }),
    ...solid(box(32.4, 73.5, 63.6, 76.2, 1), WHITE, { shine: false }),
    ...solid(FRAME.head, skin),
    ...heroFace("#8a6a50"),
    ...cheeks(43),
    ...[[30, 21, 6.5], [39, 17, 6.5], [48, 19, 6], [57, 17, 6.5], [66, 21, 6]].flatMap(([x, y, r]) => solid(ell(x, y, r, r * 0.8), cloud, { shine: false })),
  ];
}

// Pango: an armoured pangolin tank with overlapping bronze scales, a scaled
// tail and an orange vest with a hexagon badge.
function pango() {
  const skin = { b: "#e8c39a", l: "#f8dcb8", d: "#c79e70" };
  const scale = { b: "#b07a42", l: "#d29d62", d: "#7e5228" };
  const vest = { b: "#ff8a2b", l: "#ffb874", d: "#d8661a" };
  const hex = (cx, cy, r) => poly(Array.from({ length: 6 }, (_, i) => [cx + Math.cos((i * Math.PI) / 3 + Math.PI / 6) * r, cy + Math.sin((i * Math.PI) / 3 + Math.PI / 6) * r]));
  const scaleRow = (y, x0, x1, w = 7) =>
    Array.from({ length: Math.round((x1 - x0) / w) + 1 }, (_, i) => x0 + i * w).flatMap((x) => solid(pts([[x - w / 2 - 0.6, y], [x, y - 4.5], [x + w / 2 + 0.6, y], [x, y + 3.6]]), scale, { shine: false }));
  return [
    ...solid(pts([[58, 78], [68, 79], [78, 74], [86, 64], [88, 70], [82, 82], [70, 88], [58, 86]]), scale, { shine: false }),
    ...stroke("M66 80L70 86M74 76L78 82M81 70L85 75", { color: scale.d, sw: 1 }),
    ...bodyParts({ fur: skin, hands: skin, legs: skin, feet: { b: "#5a4232", l: "#7a5e4a", d: "#3e2c20" } }),
    ...solid(poly([[33, 58], [42, 56], [48, 62], [54, 56], [63, 58], [63.5, 75], [57, 81], [39, 81], [32.5, 75]]), vest, { shine: false }),
    ...solid(hex(48, 68.5, 5), GOLD, { shine: false }),
    ...flat(hex(48, 68.5, 2.4), "#ffffff", { op: 0.8 }),
    ...solid(FRAME.head, skin),
    ...solid(poly([...arc(48, 34, 25.6, 22.2, 180, 360, 24), [73, 30], [23, 30]]), scale, { shine: false }),
    ...scaleRow(16, 38, 58),
    ...scaleRow(22.5, 29, 67),
    ...scaleRow(29, 25, 71),
    ...eyes({ y: 37, rx: 3.6, ry: 4.4 }),
    ...solid(ell(48, 46, 7, 5), { b: "#f2d2ae", l: "#fff0de", d: "#d4ae84" }),
    ...flat(ell(48, 43.6, 2.6, 1.8), INK),
    ...stroke("M44.5 48.5Q48 51 51.5 48.5"),
    ...cheeks(45),
  ];
}

// Umbra: a night-watch owl in deep indigo with a pale heart-shaped face,
// huge amber eyes, ear tufts and a three-star badge.
function umbra() {
  const feather = { b: "#3d3a7a", l: "#5f5ca8", d: "#272552" };
  const face = { b: "#d9d2f2", l: "#f4f0ff", d: "#aea4d4" };
  const suit = { b: "#3f3a8f", l: "#6560bf", d: "#29256a" };
  const tuftL = [[28, 22], [22, 6], [36, 15]];
  return [
    ...solid(poly(tuftL), feather, { shine: false }),
    ...solid(poly(mirror(tuftL)), feather, { shine: false }),
    ...bodyParts({ fur: suit, hands: feather, legs: suit, feet: GOLD }),
    ...[[42, 66], [48, 63], [54, 66]].flatMap(([x, y]) => flat(star(x, y, 3.4), GOLD.b, { line: true })),
    ...solid(box(32.4, 73.5, 63.6, 76.2, 1), { b: "#6a5ad0", l: "#9486ea", d: "#4838a0" }, { shine: false }),
    ...solid(FRAME.head, feather),
    ...solid(pts([[48, 24], [56, 17.5], [66, 20], [70, 30], [66, 44], [56, 52.5], [48, 54], [40, 52.5], [30, 44], [26, 30], [30, 20], [40, 17.5]]), face),
    ...[38.5, 57.5].flatMap((x) => [
      ...flat(ell(x, 34, 8, 8.2), feather.d, { op: 0.35 }),
      ...flat(ell(x, 34, 6, 6.2), "#ffffff", { line: true }),
      ...flat(ell(x + 0.6, 34.5, 4.2, 4.4), "#ffb02e"),
      ...flat(ell(x + 0.6, 34.8, 2.2, 2.4), INK),
      ...flat(ell(x + 1.8, 33, 1, 1.1), "#ffffff"),
    ]),
    ...stroke("M30 26L44 31M52 31L66 26", { color: feather.d, sw: 1.8 }),
    ...solid(poly([[45, 42], [51, 42], [48, 48]]), GOLD, { shine: false }),
  ];
}

export const heroesCharacters = {
  zippa: { shapes: zippa() },
  nimbus: { shapes: nimbus() },
  pango: { shapes: pango() },
  umbra: { shapes: umbra() },
};

// ---------------------------------------------------------------------------
// Wardrobe
// ---------------------------------------------------------------------------

// Crest Helmet: a silver dome helmet with a red fin and round ear guards.
function crestHelmet() {
  const red = { b: "#e8384f", l: "#ff7a8a", d: "#b8223a" };
  return wearable({
    front: [
      ...solid(pts([[44, 10], [47, 1], [52, -2], [55, 2], [53, 10]]), red, { shine: false }),
      ...solid(pts([[23.5, 27], [26, 16], [36, 9], [48, 7.5], [60, 9], [70, 16], [72.5, 27], [48, 24.5]]), SILVER),
      ...stroke("M48 8L48 24", { color: SILVER.d, sw: 1 }),
      ...solid(box(23, 24, 73, 28, 1.6), { b: "#3d4fa8", l: "#6577cc", d: "#283678" }, { shine: false }),
      ...solid(ell(23.5, 34, 4, 5.5), SILVER, { shine: false }),
      ...solid(ell(72.5, 34, 4, 5.5), SILVER, { shine: false }),
      ...flat(ell(23.5, 34, 1.6, 2.4), red.b),
      ...flat(ell(72.5, 34, 1.6, 2.4), red.b),
    ],
    y: -1.5,
  });
}

// Power Visor: a wraparound visor glowing magenta-to-cyan.
function powerVisor() {
  return wearable({
    front: [
      ...solid(pts([[22, 30], [30, 27], [48, 26], [66, 27], [74, 30], [73, 37], [64, 40], [52, 39], [48, 41], [44, 39], [32, 40], [23, 37]]), { b: "#2a2f52", l: "#4a5082", d: "#181b33" }, { shine: false }),
      ...flat(pts([[28, 30.5], [48, 29], [68, 30.5], [66, 35.5], [52, 36], [48, 37.5], [44, 36], [30, 35.5]]), "#ff4fd8", { op: 0.85 }),
      ...flat(pts([[48, 29], [68, 30.5], [66, 35.5], [52, 36], [48, 37.5]]), "#3ce8ff", { op: 0.7 }),
      ...stroke("M31 31.5L44 30.6", { color: "#ffffff", sw: 1 }),
    ],
  });
}

// Power Suit: a violet suit with shoulder plates, a gold belt and a glowing
// hexagon core.
function powerSuit() {
  const violet = { b: "#7a4ad8", l: "#a37cf0", d: "#5530a8" };
  const hex = (r) => poly(Array.from({ length: 6 }, (_, i) => [48 + Math.cos((i * Math.PI) / 3 + Math.PI / 6) * r, 65 + Math.sin((i * Math.PI) / 3 + Math.PI / 6) * r]));
  return wearable({
    front: [
      ...solid(pts([[38, 55.5], [58, 55.5], [63.5, 63], [63.6, 75], [57, 81.8], [39, 81.8], [32.4, 75], [32.5, 63]]), violet),
      ...solid(box(37.5, 74, 47, 86, 2.5), violet, { shine: false }),
      ...solid(box(49, 74, 58.5, 86, 2.5), violet, { shine: false }),
      ...solid(pts([[31, 57], [39, 55], [41, 61], [33, 64]]), SILVER, { shine: false }),
      ...solid(pts(mirror([[31, 57], [39, 55], [41, 61], [33, 64]])), SILVER, { shine: false }),
      ...solid(box(32.4, 72.5, 63.6, 76, 1), GOLD, { shine: false }),
      ...flat(hex(6.5), "#5ff0ff", { op: 0.35 }),
      ...solid(hex(4.5), { b: "#5ff0ff", l: "#d4fbff", d: "#22b8cc" }, { shine: false }),
      ...flat(hex(1.8), "#ffffff"),
    ],
  });
}

// Storm Cape: a teal cape with a zigzag hem and a silver clasp.
function stormCape() {
  const teal = { b: "#1fb5a8", l: "#62dccf", d: "#14857b" };
  return wearable({
    back: solid(poly([[35, 55], [61, 55], [70, 72], [77, 91], [71, 86], [66, 92], [60, 86], [54, 92], [48, 86], [42, 92], [36, 86], [30, 92], [25, 86], [19, 91], [26, 72]]), teal),
    front: [
      ...solid(pts([[35.5, 54.5], [48, 57.5], [60.5, 54.5], [58.5, 59], [48, 61], [37.5, 59]]), teal, { shine: false }),
      ...solid(ell(48, 58.5, 3), SILVER, { shine: false }),
    ],
  });
}

// Jet Pack: twin silver boosters on the back, with orange flames.
function jetPack() {
  const flame = { b: "#ff9a2e", l: "#ffe066", d: "#e8582a" };
  return wearable({
    back: [
      ...[25, 63].flatMap((x) => [
        ...solid(pts([[x + 1, 89], [x + 4, 80], [x + 7, 89], [x + 4, 95]]), flame, { shine: false }),
        ...solid(box(x, 52, x + 8, 81, 3.5), SILVER),
        ...solid(box(x - 0.5, 76, x + 8.5, 81, 1.4), { b: "#e8384f", l: "#ff7a8a", d: "#b8223a" }, { shine: false }),
      ]),
      ...solid(box(32, 56, 64, 72, 3), { b: "#8a96ac", l: "#b6c0d2", d: "#646f84" }, { shine: false }),
    ],
    front: [
      ...tube("M37 56L39.5 70M59 56L56.5 70", "#3d4fa8", 2),
      ...tube("M39.5 66L56.5 66", "#3d4fa8", 1.6),
      ...solid(ell(48, 66, 2.2), GOLD, { shine: false }),
    ],
  });
}

// Energy Orb: a crackling ball of light hovering over the right hand.
function energyOrb() {
  return wearable({
    front: [
      ...flat(ell(73, 58, 11), "#5ff0ff", { op: 0.22 }),
      ...flat(ell(73, 58, 8), "#5ff0ff", { op: 0.35 }),
      ...solid(ell(73, 58, 5.6), { b: "#5ff0ff", l: "#e6fdff", d: "#22b8cc" }),
      ...stroke(ellD(ell(73, 58, 9, 3.4)), { color: "#ffffff", sw: 0.9 }),
      ...stroke("M66 50L68.5 52.5M81 49L78.5 52M82 66L79 63.5M64 66L67 63.5", { color: "#22b8cc", sw: 1.1 }),
    ],
  });
}

// Power Aura: golden rays bursting out behind, with bright sparks.
function powerAura() {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6 + Math.PI / 12;
    const p = (r, da) => [48 + Math.cos(a + da) * r, 52 + Math.sin(a + da) * r];
    return poly([p(20, -0.09), p(47, -0.14), p(47, 0.14), p(20, 0.09)]);
  });
  return wearable({
    back: [...flat(ell(48, 52, 36, 40), "#ffe066", { op: 0.25 }), ...rays.flatMap((r) => flat(r, "#ffc93c", { op: 0.5 }))],
    front: [
      ...flat(star(10, 20, 4), GOLD.b, { line: true }),
      ...flat(star(86, 36, 3.6), GOLD.b, { line: true }),
      ...flat(star(88, 82, 3), GOLD.b, { line: true }),
      ...flat(star(8, 74, 3.2), GOLD.b, { line: true }),
    ],
  });
}

export const heroesWearables = {
  "crest-helmet": crestHelmet(),
  "power-visor": powerVisor(),
  "power-suit": powerSuit(),
  "storm-cape": stormCape(),
  "jet-pack": jetPack(),
  "energy-orb": energyOrb(),
  "power-aura": powerAura(),
};
