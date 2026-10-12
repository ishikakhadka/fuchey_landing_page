// Anime pack art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
//
// Four original anime-style characters on the shared body frame: big glossy
// eyes, layered spiky hair (a back layer behind the head, bangs and locks in
// front) and a base outfit drawn on the body. The wardrobe is drawn to sit
// over the hair, so it fits all four. Original designs made for Fuchey.

import { INK, bodyParts, box, ell, flat, FRAME, mirror, pts, solid, stroke, wearable } from "./vectorKit.js";

const WHITE = { b: "#ffffff", l: "#ffffff", d: "#dfe1ee" };
const SKIN = {
  fair: { b: "#ffe2cf", l: "#fff3ea", d: "#f1bd9d" },
  light: { b: "#ffd7b8", l: "#ffeedf", d: "#ebb08a" },
  brown: { b: "#c98b5e", l: "#e2a97e", d: "#a2683f" },
};

// A straight-edged polygon (the renderer smooths nothing): hair spikes stay
// sharp, and arcs are sampled densely enough to read as curves.
const poly = (list) => ({ ...pts(list), straight: true });

// Points along an ellipse from angle a0 to a1 (degrees, 0 = right, 90 = down).
function arc(cx, cy, rx, ry, a0, a1, n = 18) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------

// Anime eyes: white, a tall iris darker at the top, pupil, two highlights,
// a bold upper lash with a flick at the outer corner, and a thin brow.
// `lid` (the face's colour) gives calm, half-lidded eyes.
function animeEyes({ iris, dark, y = 37, ry = 6.2, brow = INK, lid = null }) {
  const calm = Boolean(lid);
  return [38.5, 57.5].flatMap((x) => {
    const out = x < 48 ? -1 : 1;
    const top = calm ? y - ry * 0.55 : y - ry * 0.9;
    return [
      ...flat(ell(x, y, 5, ry), "#ffffff"),
      ...flat(ell(x, y + 0.5, 3.9, ry - 0.9), iris),
      ...flat(ell(x, y - ry * 0.28, 3.6, ry * 0.5), dark, { op: 0.7 }),
      ...flat(ell(x, y + 0.9, 1.7, ry * 0.42), INK),
      ...flat(ell(x - out * 1.4, y - ry * 0.32, 1.35, 1.7), "#ffffff"),
      ...flat(ell(x + out * 1.5, y + ry * 0.42, 0.75), "#ffffff", { op: 0.9 }),
      ...(calm ? flat(poly([[x - 5.4, y - 6.6], [x + 5.4, y - 6.6], [x + 5.4, top], [x - 5.4, top]]), lid) : []),
      ...stroke(`M${x - out * 5.6} ${top + 0.8}Q${x} ${top - 2.4} ${x + out * 5.6} ${top + 1}L${x + out * 7} ${top - 0.4}`, { sw: 2.1 }),
      ...stroke(`M${x - 3} ${y + ry + 0.4}Q${x} ${y + ry + 1.1} ${x + 3} ${y + ry + 0.4}`, { sw: 0.7 }),
      ...stroke(`M${x - out * 4} ${y - ry - 4.2}Q${x} ${y - ry - 5.6} ${x + out * 4.4} ${y - ry - 4.4}`, { color: brow, sw: 1 }),
    ];
  });
}

// Blush: soft pink ovals with three little hatch lines.
const blush = (y = 44) =>
  [32.5, 63.5].flatMap((x) => [
    ...flat(ell(x, y, 3.6, 1.8), "#ff8fa8", { op: 0.45 }),
    ...stroke(`M${x - 2} ${y + 0.8}L${x - 1} ${y - 0.8}M${x} ${y + 0.8}L${x + 1} ${y - 0.8}M${x + 2} ${y + 0.8}L${x + 3} ${y - 0.8}`, { color: "#ff6f8f", sw: 0.5 }),
  ]);

const nose = (skin) => stroke("M48.4 42.6L47.7 43.6", { color: skin.d, sw: 0.9 });

// ---------------------------------------------------------------------------
// Hair: back hair (behind the head) and bangs (over the forehead), as sharp
// polygons. `tips` are the bang points along the forehead: [x, y] pairs.
// ---------------------------------------------------------------------------

// The hair cap over the top of the head, ending in pointed bangs.
function bangs(tips, { left = 22, right = 74, low = 40 } = {}) {
  const top = arc(48, 32.5, 27, 23, 180, 360, 24).filter(([x]) => x >= left - 0.5 && x <= right + 0.5);
  return poly([[left, low], ...top, [right, low], ...tips]);
}

// A soft highlight band across the hair ("angel ring").
const shine = (color, y = 17) => stroke(`M33 ${y + 3}Q48 ${y - 3.5} 63 ${y + 3}`, { color, sw: 1.7 });

// Spiky crown sticking up out of the back hair.
function spikes(cx, cy, list) {
  return poly(list.flatMap(([a, r]) => [[cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r]]));
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

// Kaito: a spiky-haired hero with amber eyes, a navy tunic with an orange
// collar and a confident grin.
function kaito() {
  const skin = SKIN.light;
  const hair = { b: "#2c3152", l: "#6070a8", d: "#191c33" };
  const navy = { b: "#2f4f94", l: "#5b7cc4", d: "#1f3568" };
  const orange = { b: "#ff8a2b", l: "#ffb874", d: "#d8661a" };
  const back = spikes(48, 33, [
    [160, 26], [172, 34], [185, 26], [200, 35], [212, 27], [226, 36], [240, 28], [255, 38], [268, 29],
    [282, 39], [296, 29], [310, 37], [324, 27], [338, 34], [352, 26], [8, 32], [20, 25], [30, 22], [150, 22],
  ]);
  return [
    ...solid(back, hair, { shine: false }),
    ...bodyParts({ fur: navy, hands: skin, legs: { b: "#2a2f40", l: "#444b62", d: "#1a1e2b" }, feet: { b: "#e8434f", l: "#ff8a92", d: "#b8283a" } }),
    ...solid(poly([[39, 55.5], [48, 63], [57, 55.5], [55, 54], [48, 59], [41, 54]]), orange, { shine: false }),
    ...flat(box(33, 72.5, 63, 75, 1), "#1a1e2b"),
    ...flat(box(46, 72, 50, 75.5, 0.8), "#ffd23f", { line: true }),
    ...solid(FRAME.head, skin),
    ...animeEyes({ iris: "#f2a33a", dark: "#a8561a", brow: hair.d }),
    ...nose(skin),
    ...flat(pts([[44.5, 47], [51.5, 47], [50.5, 49.4], [48, 50.2], [45.5, 49.4]]), "#8a2b3a", { line: false }),
    ...flat(poly([[49.2, 47], [50.6, 47], [49.9, 48.4]]), "#ffffff"),
    ...stroke("M44.3 46.9Q48 47.6 51.7 46.9", { sw: 1.1 }),
    ...blush(43.5),
    ...solid(bangs([[73, 30], [68, 27], [64, 33], [60, 24.5], [55, 31], [51, 24], [47, 31.5], [43, 24.5], [38, 31], [34.5, 25], [30, 32], [27.5, 27], [23, 33]]), hair, { shine: false }),
    ...shine(hair.l),
  ];
}

// Hana: a magical girl with pink twin-tails tied with star bobbles, violet
// eyes and a white top with a pink skirt.
function hana() {
  const skin = SKIN.fair;
  const hair = { b: "#ff8cc6", l: "#ffc6e3", d: "#df5f9e" };
  const pink = { b: "#ff7fb8", l: "#ffb6d8", d: "#d9548f" };
  const gold = { b: "#ffd447", l: "#fff09b", d: "#dca81d" };
  const tailL = [[27, 22], [19, 27], [13, 42], [12, 58], [16, 72], [20, 66], [21, 52], [25, 38], [31, 28]];
  const star = (cx, cy, R) =>
    poly(Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      return [cx + Math.cos(a) * (i % 2 ? R * 0.48 : R), cy + Math.sin(a) * (i % 2 ? R * 0.48 : R)];
    }));
  return [
    ...solid(pts(tailL), hair, { shine: false }),
    ...solid(pts(mirror(tailL)), hair, { shine: false }),
    ...solid(ell(48, 32, 27, 24), hair, { shine: false }),
    ...bodyParts({ fur: WHITE, hands: skin, legs: skin, feet: pink }),
    ...solid(poly([[33, 70], [63, 70], [67, 80.5], [58, 82.5], [48, 81], [38, 82.5], [29, 80.5]]), pink, { shine: false }),
    ...stroke("M30 80.2Q48 84 66 80.2", { color: "#ffffff", sw: 1 }),
    ...solid(poly([[48, 58.5], [42.5, 55.5], [42.5, 61.5]]), pink, { shine: false }),
    ...solid(poly([[48, 58.5], [53.5, 55.5], [53.5, 61.5]]), pink, { shine: false }),
    ...solid(ell(48, 58.5, 1.8), gold, { shine: false }),
    ...solid(FRAME.head, skin),
    ...animeEyes({ iris: "#9b6bff", dark: "#5532b8", ry: 6.6, brow: hair.d }),
    ...nose(skin),
    ...flat(pts([[45.6, 47.2], [50.4, 47.2], [49.4, 49.6], [48, 50.2], [46.6, 49.6]]), "#e0566f"),
    ...flat(ell(48, 49.3, 1.4, 0.6), "#ff9fb0"),
    ...blush(44),
    ...solid(bangs([[73, 34], [69, 26], [65, 28.6], [61, 24.5], [56.5, 28.4], [52.5, 24.5], [48, 28.8], [43.5, 24.5], [39.5, 28.4], [35, 24.5], [31, 28.6], [27, 26], [23, 34]]), hair, { shine: false }),
    ...shine(hair.l),
    ...solid(star(26, 23, 4.6), gold, { shine: false }),
    ...solid(star(70, 23, 4.6), gold, { shine: false }),
  ];
}

// Ren: a calm silver-haired swordsman with a long ponytail, teal eyes, a dark
// kimono top with a white collar and a crimson sash.
function ren() {
  const skin = SKIN.brown;
  const hair = { b: "#dfe3ef", l: "#ffffff", d: "#a3abc2" };
  const kimono = { b: "#2d2f45", l: "#4c5070", d: "#1b1c2b" };
  const sash = { b: "#b5304a", l: "#de5a72", d: "#851d33" };
  const tail = [[62, 18], [70, 15], [76, 22], [78, 36], [80, 52], [77, 68], [72, 76], [72, 62], [72, 46], [69, 32], [64, 25]];
  return [
    ...solid(pts(tail), hair, { shine: false }),
    ...solid(ell(48, 32.5, 27, 23.5), hair, { shine: false }),
    ...bodyParts({ fur: kimono, hands: skin, legs: { b: "#59627e", l: "#7c86a3", d: "#3d455e" }, feet: { b: "#6b4a2e", l: "#8f6a48", d: "#4a311d" } }),
    ...flat(poly([[40, 55.5], [48, 66], [56, 55.5], [53.5, 55.5], [48, 62.5], [42.5, 55.5]]), "#f4f1ea"),
    ...solid(box(32.6, 69.5, 63.4, 74, 1.2), sash, { shine: false }),
    ...stroke("M55 74L57.5 80M58 74L61.5 79", { color: sash.d, sw: 1.4 }),
    ...solid(FRAME.head, skin),
    ...animeEyes({ iris: "#2fb5a8", dark: "#176e66", ry: 5.4, lid: skin.b, brow: hair.d }),
    ...nose(skin),
    ...stroke("M46 47.8L50.2 47.4", { sw: 1 }),
    ...solid(bangs([[74, 40], [70, 28], [66, 33], [61, 24.5], [57, 29], [52, 23], [46, 28.5], [41, 23.5], [36, 31], [31, 26], [27, 38], [24.5, 30], [22, 41]]), hair, { shine: false }),
    ...solid(poly([[26, 30], [31, 33], [30, 46], [26.5, 54], [24, 44]]), hair, { shine: false }),
    ...shine(hair.l),
    ...solid(box(66, 13.5, 71, 18, 1.5), sash, { shine: false }),
  ];
}

// Miko: a fox-spirit shrine maiden with orange hair, fox ears and a fluffy
// white-tipped tail, golden eyes, a white haori and red hakama.
function miko() {
  const skin = SKIN.fair;
  const hair = { b: "#ef7d3c", l: "#ffb37c", d: "#c45a20" };
  const cream = { b: "#fff3df", l: "#ffffff", d: "#ecd6b4" };
  const red = { b: "#d8323f", l: "#f2646e", d: "#a51f2c" };
  const earL = [[26, 22], [27.5, 1], [42, 14]];
  const innerL = [[29, 17.5], [29.8, 6], [38, 13.5]];
  const tail = [[58, 76], [70, 72], [80, 60], [86, 46], [84, 34], [90, 40], [92, 54], [86, 70], [74, 80], [62, 82]];
  return [
    ...solid(pts(tail), hair, { shine: false }),
    ...solid(pts([[86, 46], [84, 34], [90, 40], [91, 47]]), cream, { shine: false }),
    ...solid(ell(48, 32.5, 27, 23.5), hair, { shine: false }),
    ...solid(poly(earL), hair, { shine: false }),
    ...flat(poly(innerL), cream.b),
    ...solid(poly(mirror(earL)), hair, { shine: false }),
    ...flat(poly(mirror(innerL)), cream.b),
    ...bodyParts({ fur: WHITE, hands: skin, legs: red, feet: { b: "#f7f3ec", l: "#ffffff", d: "#d8d0c2" } }),
    ...solid(poly([[32.6, 69], [63.4, 69], [64.5, 81.5], [48, 82.5], [31.5, 81.5]]), red, { shine: false }),
    ...stroke("M42 71.5L41 81M48 71.5L48 82M54 71.5L55 81", { color: red.d, sw: 0.8 }),
    ...flat(poly([[40, 55.5], [48, 64], [56, 55.5], [53.5, 55.5], [48, 61], [42.5, 55.5]]), red.b),
    ...solid(FRAME.head, skin),
    ...animeEyes({ iris: "#ffbf2e", dark: "#c27a07", brow: hair.d }),
    ...[33, 63].flatMap((x) => stroke(`M${x - 1.6} 45.6L${x + 1.6} 45`, { color: red.b, sw: 1.2 })),
    ...nose(skin),
    ...stroke("M44.6 47.4Q46.3 49.3 48 47.4Q49.7 49.3 51.4 47.4", { sw: 1.1 }),
    ...blush(43.5),
    ...solid(bangs([[73, 33], [69, 27], [65.5, 28.6], [60.5, 24], [56, 28.4], [51.5, 24], [48, 28.6], [44.5, 24], [40, 28.4], [35.5, 24], [30.5, 28.6], [27, 27], [23, 33]]), hair, { shine: false }),
    ...shine(hair.l),
  ];
}

export const animeCharacters = {
  kaito: { shapes: kaito() },
  hana: { shapes: hana() },
  ren: { shapes: ren() },
  miko: { shapes: miko() },
};

// ---------------------------------------------------------------------------
// Wardrobe: drawn over the hair (its outline is the head ellipse grown to
// 27 × 23.5 around (48, 32.5)), so each piece fits all four.
// ---------------------------------------------------------------------------

// Hachimaki: a white headband with a red stripe, knotted on the right with
// tails streaming out.
function hachimaki() {
  const cloth = { b: "#fbfbff", l: "#ffffff", d: "#d8dbe8" };
  return wearable({
    front: [
      ...solid(pts([[73, 22], [80, 17], [86, 19.5], [80, 22.5], [75, 25.5]]), cloth, { shine: false }),
      ...solid(pts([[73.5, 24], [81, 26], [87, 31], [80, 30], [74, 27]]), cloth, { shine: false }),
      ...solid(poly([[21.6, 25.6], ...arc(48, 37, 26.6, 16.6, 192, 348, 16), [74.4, 25.6], ...arc(48, 43, 26.4, 17.5, 340, 200, 16)]), cloth, { shine: false }),
      ...flat(poly([...arc(48, 39.5, 26.4, 17, 190, 350, 16), ...arc(48, 41.6, 26.4, 17.6, 350, 190, 16)]), "#e2384d"),
      ...solid(ell(74, 23.8, 2.8, 2.6), cloth, { shine: false }),
    ],
  });
}

// Cat-Ear Headphones: a lilac band with cat ears and glowing mint cups.
function catEarHeadphones() {
  const lilac = { b: "#b99cff", l: "#ddd0ff", d: "#8a6ae0" };
  const mint = { b: "#7ff0d0", l: "#c8fff0", d: "#46c9a6" };
  const ear = [[31, 10.5], [32, -1.5], [41.5, 6.5]];
  return wearable({
    front: [
      ...solid(poly(ear), lilac, { shine: false }),
      ...flat(poly([[33.2, 8.4], [33.8, 2], [38.6, 6.4]]), "#ffb3d1"),
      ...solid(poly(mirror(ear)), lilac, { shine: false }),
      ...flat(poly(mirror([[33.2, 8.4], [33.8, 2], [38.6, 6.4]])), "#ffb3d1"),
      ...stroke("M21 37C17 0 79 0 75 37", { color: INK, sw: 5.2 }),
      ...stroke("M21 37C17 0 79 0 75 37", { color: lilac.b, sw: 2.9 }),
      ...solid(ell(21, 38.5, 5.4, 7.6), lilac),
      ...solid(ell(75, 38.5, 5.4, 7.6), lilac),
      ...flat(ell(21, 38.5, 2.6, 4.4), mint.b, { line: true }),
      ...flat(ell(75, 38.5, 2.6, 4.4), mint.b, { line: true }),
    ],
  });
}

// Kitsune Mask: a white fox mask with red markings, worn tilted on the side
// of the head.
function kitsuneMask() {
  const white = { b: "#fdfbf7", l: "#ffffff", d: "#ddd6ca" };
  const red = "#e2384d";
  const cx = 63;
  const cy = 16;
  const t = (dx, dy) => [cx + dx * 0.94 - dy * 0.34, cy + dx * 0.34 + dy * 0.94];
  const face = [t(-9, -4), t(-10, -13), t(-4, -7), t(4, -7), t(10, -13), t(9, -4), t(8, 4), t(0, 11), t(-8, 4)];
  return wearable({
    front: [
      ...solid(poly(face), white),
      ...flat(poly([t(-8.6, -6), t(-9.2, -11.4), t(-5, -7)]), red),
      ...flat(poly([t(8.6, -6), t(9.2, -11.4), t(5, -7)]), red),
      ...[-1, 1].flatMap((s) => flat(poly([t(s * 2, -1.5), t(s * 6.5, -2.5), t(s * 5, 0.2)]), INK)),
      ...flat(poly([t(-1.6, 6), t(1.6, 6), t(0, 8)]), INK),
      ...[-1, 1].flatMap((s) => stroke(`M${t(s * 3, 2).join(" ")}L${t(s * 6.5, 3.5).join(" ")}`, { color: red, sw: 1.1 })),
    ],
  });
}

// Sailor Uniform: a white top with a navy sailor collar and a red scarf,
// cut short so skirts and hakama still show.
function sailorUniform() {
  const top = { b: "#fbfbff", l: "#ffffff", d: "#d9dcea" };
  const navy = { b: "#2d3f7c", l: "#4c63aa", d: "#1c2a58" };
  const red = { b: "#e2384d", l: "#ff7b8b", d: "#b1233a" };
  const body = [[37.5, 55], [58.5, 55], [64.2, 63], [64.4, 71.5], [56, 74.4], [48, 73.4], [40, 74.4], [31.6, 71.5], [31.8, 63]];
  const arm = [[36.5, 56.8], [30.8, 60.6], [26.6, 67.4], [29.6, 71.2], [34, 67], [38.6, 63.4]];
  return wearable({
    front: [
      ...solid(pts(body), top, { shine: false }),
      ...solid(pts(arm), top, { shine: false }),
      ...solid(pts(mirror(arm)), top, { shine: false }),
      ...[arm, mirror(arm)].flatMap((a) => stroke(`M${a[2][0] - (a[2][0] < 48 ? -0.6 : 0.6)} ${a[2][1] + 1}L${a[3][0]} ${a[3][1] - 0.6}`, { color: navy.b, sw: 1.6 })),
      ...solid(poly([[37, 55], [48, 66.5], [59, 55], [63, 58.5], [57.5, 63], [48, 71], [38.5, 63], [33, 58.5]]), navy, { shine: false }),
      ...stroke("M36.4 59.2L48 69.4L59.6 59.2", { color: "#ffffff", sw: 0.8 }),
      ...solid(poly([[44, 64], [52, 64], [50, 67.5], [53, 74.5], [48, 71.5], [43, 74.5], [46, 67.5]]), red, { shine: false }),
      ...stroke("M32.6 70.6Q40 73 48 72.1Q56 73 63.4 70.6", { color: navy.b, sw: 1.3 }),
    ],
  });
}

// Hero Scarf: a long red scarf wrapped at the neck, tails streaming left.
function heroScarf() {
  const red = { b: "#e8384f", l: "#ff7a8a", d: "#b8223a" };
  return wearable({
    front: [
      ...solid(pts([[37, 57], [27, 58.5], [17, 55.5], [8, 58], [12, 62], [21, 62.5], [31, 63]]), red, { shine: false }),
      ...solid(pts([[38, 59.5], [30, 64], [21, 66], [14, 71.5], [20, 72], [29, 68.5], [37, 64.5]]), red, { shine: false }),
      ...solid(pts([[37, 53.5], [48, 56.5], [59, 53.5], [61, 58], [48, 62], [35, 58]]), red),
      ...stroke("M38.5 56.8Q48 59.6 57.5 56.8", { color: red.d, sw: 0.9 }),
    ],
  });
}

// Wooden Bokken: a practice sword gripped in the right hand: the blade rises
// from the top of the fist and the pommel shows below it.
function bokken() {
  const wood = { b: "#c99258", l: "#e8b882", d: "#9a6834" };
  const dark = { b: "#2a2a35", l: "#4a4a5a", d: "#15151c" };
  return wearable({
    front: [
      ...solid(poly([[63.6, 79.6], [65.2, 76.4], [67.6, 77.6], [66.2, 80.8]]), dark, { shine: false }),
      ...solid(poly([[71.4, 68.4], [74, 69.6], [90.4, 40.8], [87.6, 39.5]]), wood, { shine: false }),
      ...solid(pts([[90.4, 40.8], [87.6, 39.5], [88.8, 36.6], [91.4, 37.3]]), wood, { shine: false }),
      ...solid(ell(72.8, 68.2, 4.2, 1.5), dark, { shine: false }),
    ],
  });
}

// Star Wand: a pink wand topped with a gold star and sparkles.
function starWand() {
  const gold = { b: "#ffd447", l: "#fff09b", d: "#dca81d" };
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 3.6 : 7.6;
    return [83 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  });
  const sparkle = (x, y, r) => flat(poly([[x, y - r], [x + r * 0.3, y - r * 0.3], [x + r, y], [x + r * 0.3, y + r * 0.3], [x, y + r], [x - r * 0.3, y + r * 0.3], [x - r, y], [x - r * 0.3, y - r * 0.3]]), "#ffe7a3");
  return wearable({
    front: [
      ...solid(poly([[70.8, 68.6], [73, 69.8], [81.6, 56.8], [79.6, 55.6]]), { b: "#ff8cc6", l: "#ffc6e3", d: "#df5f9e" }, { shine: false }),
      ...solid(poly(star), gold),
      ...flat(ell(83, 50.6, 1.5, 1.2), "#ff8cc6"),
      ...sparkle(93, 40, 2.6),
      ...sparkle(75, 41, 1.8),
      ...sparkle(94, 58, 1.6),
    ],
  });
}

// Randoseru: a classic red school backpack; the bag shows round the sides,
// the straps go over the shoulders.
function randoseru() {
  const red = { b: "#d9333f", l: "#f2656e", d: "#a51f2c" };
  const strap = (x0, x1) => poly([[x0, 55], [x0 + 3.4, 55], [x1 + 3, 66], [x1, 66]]);
  return wearable({
    back: [...solid(box(27, 47.5, 69, 78, 6), red), ...flat(box(30, 45.5, 66, 51, 3), red.d, { line: true })],
    front: [
      ...solid(strap(36.2, 37.6), red, { shine: false }),
      ...solid(strap(56.4, 55), red, { shine: false }),
      ...[39.2, 56.8].flatMap((x) => solid(box(x - 1.6, 63.5, x + 1.6, 66.8, 0.6), { b: "#d7dde6", l: "#ffffff", d: "#9aa5b5" }, { shine: false })),
    ],
  });
}

// Sakura Petals: cherry-blossom petals drifting around the character.
function sakuraPetals() {
  const petal = (x, y, s, a) => {
    const t = (dx, dy) => [x + (dx * Math.cos(a) - dy * Math.sin(a)) * s, y + (dx * Math.sin(a) + dy * Math.cos(a)) * s];
    return pts([t(0, -2.2), t(1.5, -0.6), t(1.1, 1.6), t(0, 1.1), t(-1.1, 1.6), t(-1.5, -0.6)]);
  };
  const tone = { b: "#ffb7d0", l: "#ffe3ee", d: "#f08bb1" };
  const back = [[10, 22, 1.5, 0.4], [86, 12, 1.3, -0.5], [6, 62, 1.2, 1.1], [90, 70, 1.5, 0.2]];
  const front = [[18, 8, 1.1, -0.8], [80, 30, 1.2, 0.9], [14, 44, 1.4, -0.2], [84, 52, 1.1, 1.6], [22, 86, 1.3, 0.6], [76, 90, 1.2, -1.1], [92, 32, 0.9, 0.3]];
  return wearable({
    back: back.flatMap(([x, y, s, a]) => solid(petal(x, y, s, a), tone, { shine: false })),
    front: front.flatMap(([x, y, s, a]) => solid(petal(x, y, s, a), tone, { shine: false })),
  });
}

export const animeWearables = {
  hachimaki: hachimaki(),
  "cat-ear-headphones": catEarHeadphones(),
  "kitsune-mask": kitsuneMask(),
  "sailor-uniform": sailorUniform(),
  "hero-scarf": heroScarf(),
  bokken: bokken(),
  "star-wand": starWand(),
  randoseru: randoseru(),
  "sakura-petals": sakuraPetals(),
};
