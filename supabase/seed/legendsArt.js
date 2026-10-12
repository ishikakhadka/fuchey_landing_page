// Legends Reimagined pack art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
// Four characters drawn from public-domain folklore and old stories (a
// night-time count, an outlaw archer of the greenwood, a court wizard and a
// fog-bound detective) as Fuchey companions on the shared body frame, plus a
// wardrobe that fits all of them. Original designs made for Fuchey; none of
// them follow any film or game version of these legends.

import { INK, arc, bodyParts, box, cheeks, ell, ellD, eyes, flat, FRAME, mirror, poly, pts, solid, star, stroke, tube, wearable } from "./vectorKit.js";

const GOLD = { b: "#ffc93c", l: "#fff0a0", d: "#d99a14" };
const WHITE = { b: "#ffffff", l: "#ffffff", d: "#dfe1ee" };
const BOOT = { b: "#6b4a2e", l: "#8f6a48", d: "#4a311d" };

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

// Nocturne: a pale count with a slicked widow's peak, pointed ears, ruby
// eyes, two tiny fangs and a black suit with a red cravat.
function nocturne() {
  const skin = { b: "#ece2f7", l: "#fcf9ff", d: "#c9badf" };
  const hair = { b: "#2a2540", l: "#4e4670", d: "#16132a" };
  const suit = { b: "#2d2a3e", l: "#4a4663", d: "#1b1928" };
  const red = { b: "#c8243c", l: "#ef5e72", d: "#8f142a" };
  const earL = [[25.5, 29], [15, 24.5], [24, 41]];
  return [
    ...solid(poly(earL), skin, { shine: false }),
    ...solid(poly(mirror(earL)), skin, { shine: false }),
    ...bodyParts({ fur: suit, hands: skin, feet: { b: "#1b1928", l: "#3a3650", d: "#0e0d17" } }),
    ...flat(poly([[40.5, 55.5], [48, 67], [55.5, 55.5]]), WHITE.b),
    ...solid(poly([[48, 58], [43, 55.5], [44, 61], [48, 60.5], [52, 61], [53, 55.5]]), red, { shine: false }),
    ...solid(pts([[46, 60], [50, 60], [49.4, 66], [48, 67.5], [46.6, 66]]), red, { shine: false }),
    ...solid(FRAME.head, skin),
    ...[39, 57].flatMap((x) => [
      ...flat(ell(x, 33.5, 4.4, 5), "#ffffff", { line: true }),
      ...flat(ell(x + 0.6, 34, 2.6, 3.2), red.b),
      ...flat(ell(x + 0.6, 34.3, 1.2, 1.7), INK),
      ...flat(ell(x + 1.6, 32.6, 0.9, 1), "#ffffff"),
    ]),
    ...stroke("M33 27.5L44 29.4M52 29.4L63 27.5", { sw: 1.6 }),
    ...stroke("M42.5 45.5Q48 49.2 53.5 45.5"),
    ...flat(poly([[44.4, 46.7], [46.2, 47.6], [45.2, 50]]), "#ffffff", { line: true }),
    ...flat(poly([[51.6, 46.7], [49.8, 47.6], [50.8, 50]]), "#ffffff", { line: true }),
    ...cheeks(42.5, "#c9a0e0"),
    ...solid(poly([...arc(48, 32.5, 26.5, 22.5, 180, 360, 24), [74, 33], [70, 22.5], [59, 20.5], [48, 28], [37, 20.5], [26, 22.5], [22, 33]]), hair, { shine: false }),
    ...stroke("M31 16.5Q40 12.5 46 14.5M50 14.5Q56 12.5 65 16.5", { color: hair.l, sw: 1.2 }),
  ];
}

// Rowan: an outlaw fox archer of the greenwood in a green tunic and boots,
// with a white-tipped brush of a tail.
function rowan() {
  const fur = { b: "#f08a3c", l: "#ffb877", d: "#c9661c" };
  const cream = { b: "#fff4e4", l: "#ffffff", d: "#ead3b2" };
  const green = { b: "#4f9a4a", l: "#7cc477", d: "#357032" };
  const dark = { b: "#4a2c22", l: "#6e4636", d: "#2e1a13" };
  const earL = [[26, 25], [24.5, 2], [42, 15]];
  const tipL = [[25.3, 13], [24.5, 2], [30.5, 7]];
  const tail = [[58, 77], [70, 72], [79, 60], [84, 46], [88, 52], [87, 66], [79, 78], [66, 83]];
  return [
    ...solid(pts(tail), fur, { shine: false }),
    ...solid(pts([[84, 46], [88, 52], [87.5, 58], [83, 55]]), cream, { shine: false }),
    ...solid(poly(earL), fur, { shine: false }),
    ...flat(poly(tipL), dark.b),
    ...solid(poly(mirror(earL)), fur, { shine: false }),
    ...flat(poly(mirror(tipL)), dark.b),
    ...bodyParts({ fur: green, hands: dark, legs: { b: "#6d5a3c", l: "#8f7a58", d: "#4c3e26" }, feet: BOOT }),
    ...flat(poly([[41, 55.5], [48, 62], [55, 55.5]]), cream.b),
    ...solid(poly([[33, 74], [63, 74], [65, 82], [58, 80], [53, 83], [48, 80.5], [43, 83], [38, 80], [31, 82]]), green, { shine: false }),
    ...solid(box(32.4, 70.5, 63.6, 74, 1), dark, { shine: false }),
    ...solid(box(45.5, 69.8, 50.5, 74.7, 0.8), GOLD, { shine: false }),
    ...solid(FRAME.head, fur),
    ...solid(pts([[26, 36], [34, 40], [42, 39], [48, 41], [54, 39], [62, 40], [70, 36], [66, 48], [56, 54.5], [48, 55.5], [40, 54.5], [30, 48]]), cream),
    ...eyes({ y: 32.5, rx: 4.2, ry: 5.2, look: [1, 0.6] }),
    ...stroke("M33.5 25.6Q39 24.4 43.5 27M52.5 27Q57 24.4 62.5 25.6", { sw: 1.4 }),
    ...flat(ell(48, 42.6, 3, 2.2), INK),
    ...flat(ell(47, 42, 1, 0.6), "#ffffff", { op: 0.7 }),
    ...stroke("M43.5 46.5Q46 49 48 46.4Q50.5 49.4 54 46"),
  ];
}

// Merlin: a court wizard with a long white beard, bushy brows, a round nose
// and a midnight robe sprinkled with stars.
function merlin() {
  const skin = { b: "#ffd9bf", l: "#fff0e4", d: "#eab08f" };
  const beard = { b: "#f4f4fb", l: "#ffffff", d: "#c9cbe0" };
  const robe = { b: "#3d4fa8", l: "#6577cc", d: "#283678" };
  return [
    ...bodyParts({ fur: robe, hands: skin, legs: robe, feet: { b: "#7a3b8f", l: "#a463b8", d: "#55246a" } }),
    ...[[37, 66], [57, 62], [53, 77], [40, 77], [60, 74]].flatMap(([x, y]) => flat(star(x, y, 2), GOLD.b)),
    ...solid(FRAME.head, skin),
    ...solid(ell(23.5, 36, 5.5, 8), beard, { shine: false }),
    ...solid(ell(72.5, 36, 5.5, 8), beard, { shine: false }),
    ...solid(pts([[27, 40], [35, 45], [42, 44], [48, 46], [54, 44], [61, 45], [69, 40], [67, 56], [60, 66], [53, 74], [48, 78], [43, 74], [36, 66], [29, 56]]), beard),
    ...stroke("M42 56Q44 64 47 70M54 56Q52 64 49 70", { color: beard.d, sw: 0.9 }),
    ...solid(pts([[48, 44], [55, 42.5], [60, 45.5], [55, 47], [48, 46.4], [41, 47], [36, 45.5], [41, 42.5]]), beard, { shine: false }),
    ...flat(ell(48, 48.8, 2.4, 1.5), "#c75a6a"),
    ...[39, 57].flatMap((x) => [
      ...flat(ell(x, 33.5, 3.4, 4), "#ffffff", { line: true }),
      ...flat(ell(x + 0.5, 34, 2, 2.6), "#3a6ad0"),
      ...flat(ell(x + 0.5, 34.3, 1, 1.4), INK),
      ...flat(ell(x + 1.3, 32.8, 0.7, 0.8), "#ffffff"),
    ]),
    ...solid(pts([[32, 28.5], [36, 25], [41, 25.5], [45, 28], [40, 29.5], [35, 30]]), beard, { shine: false }),
    ...solid(pts(mirror([[32, 28.5], [36, 25], [41, 25.5], [45, 28], [40, 29.5], [35, 30]])), beard, { shine: false }),
    ...solid(ell(48, 40, 3.6, 3.2), skin, { shine: false }),
    ...cheeks(40),
  ];
}

// Inspector Hound: a basset hound detective with long droopy ears, sleepy
// eyes, a big black nose and a check overcoat.
function hound() {
  const fur = { b: "#d9a066", l: "#f2c590", d: "#b07a42" };
  const brown = { b: "#7a4a2a", l: "#9e6a44", d: "#55301a" };
  const cream = { b: "#fff4e4", l: "#ffffff", d: "#ead3b2" };
  const coat = { b: "#9a7a52", l: "#bfa078", d: "#6e5434" };
  const earL = [[29, 22], [22, 26], [18, 40], [18, 56], [22, 62], [27, 58], [30, 44], [33, 30]];
  return [
    ...bodyParts({ fur: coat, hands: fur, legs: { b: "#5a4a3a", l: "#7a6a58", d: "#3e3226" }, feet: BOOT }),
    ...stroke("M36 60L35 80M42 56L42 81M54 56L54 81M60 60L61 80M33 66L63 66M32.6 73L63.4 73", { color: coat.d, sw: 0.7 }),
    ...flat(poly([[42, 55.5], [48, 63], [54, 55.5]]), cream.b),
    ...stroke("M48 63L48 81", { color: coat.d, sw: 1 }),
    ...[66.5, 72, 77.5].flatMap((y) => solid(ell(51.5, y, 1.1), { b: "#3a2a20", l: "#5a4636", d: "#22180f" }, { shine: false })),
    ...solid(FRAME.head, fur),
    ...solid(pts([[48, 14], [52, 22], [53, 34], [58, 42], [48, 47], [38, 42], [43, 34], [44, 22]]), cream, { shine: false }),
    ...[39, 57].flatMap((x) => [
      ...flat(ell(x, 34, 4.2, 4.8), "#ffffff", { line: true }),
      ...flat(ell(x + 0.6, 35, 2.4, 2.8), INK),
      ...flat(ell(x + 1.4, 34, 0.7, 0.8), "#ffffff"),
      ...flat(poly([...arc(x, 34, 4.9, 5.4, 180, 360, 10)]), fur.d),
      ...stroke(`M${x - 4.2} 33.6Q${x} 32.6 ${x + 4.2} 33.6`, { sw: 1.3 }),
    ]),
    ...solid(ell(48, 45, 11, 6.5), cream),
    ...flat(pts([[43, 41], [53, 41], [52, 44.5], [48, 46], [44, 44.5]]), INK),
    ...flat(ell(46, 42.2, 1.4, 0.8), "#ffffff", { op: 0.7 }),
    ...stroke("M48 46L48 48.5M42.5 48Q45.5 51 48 48.5Q50.5 51 53.5 48"),
    ...solid(pts(earL), brown, { shine: false }),
    ...solid(pts(mirror(earL)), brown, { shine: false }),
  ];
}

export const legendsCharacters = {
  nocturne: { shapes: nocturne() },
  rowan: { shapes: rowan() },
  merlin: { shapes: merlin() },
  hound: { shapes: hound() },
};

// ---------------------------------------------------------------------------
// Wardrobe
// ---------------------------------------------------------------------------

// Deerstalker: a brown check cap with a peak and ear flaps tied on top.
function deerstalker() {
  const tweed = { b: "#a8845a", l: "#cdae84", d: "#7c5e3a" };
  return wearable({
    front: [
      ...solid(pts([[24.5, 27], [27.5, 15.5], [37.5, 9], [48, 7.5], [58.5, 9], [68.5, 15.5], [71.5, 27], [48, 24]]), tweed),
      ...stroke("M36.5 10L35 25M42.5 8.3L42 24.5M53.5 8.3L54 24.5M59.5 10L61 25M27 19Q48 11 69 19", { color: tweed.d, sw: 0.8 }),
      ...stroke("M26 23Q48 15.5 70 23", { color: "#c2483e", sw: 0.8 }),
      ...solid(pts([[33, 24], [48, 22.5], [63, 24], [59, 28.5], [48, 29.5], [37, 28.5]]), tweed, { shine: false }),
      ...solid(pts([[24, 22], [29, 24], [30, 33], [25.5, 35], [22, 29]]), tweed, { shine: false }),
      ...solid(pts(mirror([[24, 22], [29, 24], [30, 33], [25.5, 35], [22, 29]])), tweed, { shine: false }),
      ...stroke("M45 7.5Q42 3.5 44 2.5Q46.5 3 48 7M51 7.5Q54 3.5 52 2.5Q49.5 3 48 7", { color: "#5a3e22", sw: 1 }),
    ],
    y: -1,
  });
}

// Wizard Hat: a tall, floppy midnight hat with a gold band and stars.
function wizardHat() {
  const navy = { b: "#2f3a8f", l: "#5a66c0", d: "#1d2563" };
  return wearable({
    front: [
      ...solid(pts([[29.5, 22], [37, 6], [45, -4], [54, -11], [61, -12], [57, -7], [56, 2], [60, 14], [66.5, 22]]), navy),
      ...solid(box(29, 17.5, 67, 22.5, 1.4), GOLD, { shine: false }),
      ...solid(ell(48, 23.5, 30, 5.5), navy, { shine: false }),
      ...flat(star(45, 7, 3.2), GOLD.b),
      ...flat(star(53, -2, 2.2), GOLD.b),
      ...flat(star(38, 13, 1.8), GOLD.b),
      ...flat(poly([[57, 9.5], [60, 6], [59, 11.5]]), "#c9d4ff", { op: 0.8 }),
    ],
    y: -2,
  });
}

// Gold Monocle: a gold-rimmed lens over the right eye on a fine chain.
function monocle() {
  return wearable({
    front: [
      ...stroke("M61.5 38.5C64 46 60 52 63.5 60", { color: GOLD.d, sw: 0.8 }),
      ...flat(ell(57, 33.5, 6, 6.4), "#bfe6ff", { op: 0.3 }),
      ...tube(ellD(ell(57, 33.5, 6, 6.4)), GOLD.b, 1.4),
      ...stroke("M53.5 30.5Q55 29 57 28.8", { color: "#ffffff", sw: 1 }),
    ],
  });
}

// Midnight Cape: a black cape with a crimson lining and a tall pointed
// Midnight Cape: a black cape with a crimson lining and a tall pointed
// collar standing up on both sides of the head.
function midnightCape() {
  const black = { b: "#262236", l: "#433e5a", d: "#141220" };
  const red = { b: "#c8243c", l: "#ef5e72", d: "#8f142a" };
  const collarL = [[34, 57], [16, 46], [11, 20], [22, 30], [30, 44]];
  return wearable({
    back: [
      ...solid(pts([[35, 55], [61, 55], [70, 72], [77, 91], [64, 88], [48, 92], [32, 88], [19, 91], [26, 72]]), black),
      ...solid(poly(collarL), red, { shine: false }),
      ...solid(poly(mirror(collarL)), red, { shine: false }),
      ...stroke("M14 25L19 44M82 25L77 44", { color: red.d, sw: 0.8 }),
    ],
    front: [
      ...solid(poly([[36, 54.5], [30, 57], [36, 63], [41, 57]]), red, { shine: false }),
      ...solid(poly([[60, 54.5], [66, 57], [60, 63], [55, 57]]), red, { shine: false }),
      ...stroke("M40 58.5Q48 61.5 56 58.5", { color: GOLD.d, sw: 0.9 }),
      ...solid(ell(39.5, 58.3, 1.8), GOLD, { shine: false }),
      ...solid(ell(56.5, 58.3, 1.8), GOLD, { shine: false }),
    ],
  });
}

// Magnifying Glass: a brass-rimmed lens, held up in the right hand.
function magnifyingGlass() {
  return wearable({
    front: [
      ...tube("M68.5 74L74 62.5", "#6b4a2e", 2.6),
      ...flat(ell(77.5, 55, 7, 7), "#bfe6ff", { op: 0.45 }),
      ...tube(ellD(ell(77.5, 55, 7, 7)), GOLD.b, 1.8),
      ...stroke("M73.5 52Q74.5 49.5 77 48.6", { color: "#ffffff", sw: 1.2 }),
    ],
  });
}

// Greenwood Longbow: a tall yew bow held in the left hand.
function longbow() {
  return wearable({
    front: [
      ...stroke("M28.5 47L28.5 95", { color: "#f4ecd8", sw: 0.7 }),
      ...tube("M28.5 47Q13 71 28.5 95", "#a8743e", 2.2),
      ...solid(box(24.5, 68.5, 31, 75.5, 1.4), { b: "#4f9a4a", l: "#7cc477", d: "#357032" }, { shine: false }),
    ],
  });
}

// Will-o'-Wisps: little ghost-lights that float around in the dark.
function willOWisps() {
  const tone = { b: "#7af0e0", l: "#e0fffb", d: "#3cc2b0" };
  const wisp = (x, y, s = 1) => [
    ...flat(ell(x, y + 1, 6 * s), "#9ff7ea", { op: 0.25 }),
    ...solid(pts([[x, y - 5 * s], [x + 3 * s, y], [x + 2.2 * s, y + 3 * s], [x, y + 4 * s], [x - 2.2 * s, y + 3 * s], [x - 3 * s, y]]), tone, { shine: false }),
    ...flat(ell(x, y + 1.6 * s, 1.2 * s, 1.5 * s), "#ffffff", { op: 0.9 }),
  ];
  return wearable({
    back: [...wisp(10, 30), ...wisp(86, 18, 0.8), ...wisp(89, 72, 0.9)],
    front: [...wisp(12, 64, 0.9), ...wisp(84, 44, 1.1), ...wisp(8, 88, 0.7)],
  });
}

export const legendsWearables = {
  deerstalker: deerstalker(),
  "wizard-hat": wizardHat(),
  monocle: monocle(),
  "midnight-cape": midnightCape(),
  "magnifying-glass": magnifyingGlass(),
  longbow: longbow(),
  "will-o-wisps": willOWisps(),
};
