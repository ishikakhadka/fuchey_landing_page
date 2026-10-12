// Cartoon pack art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
// Four original characters on the shared body frame, and a wardrobe that
// fits all of them. Original designs made for Fuchey.

import { INK, box, bodyParts, cheeks, ell, eyes, flat, FRAME, mirror, pts, solid, stroke, wearable } from "./vectorKit.js";

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

// Biscuit: a golden pup with floppy brown ears, a patch over one eye, a cream
// muzzle and a wagging tail.
function biscuit() {
  const fur = { b: "#f0b35e", l: "#ffd99a", d: "#cf8a3c" };
  const cream = { b: "#fff0d4", l: "#ffffff", d: "#ecd0a2" };
  const brown = { b: "#9a5b32", l: "#c07d4c", d: "#73401f" };
  const earL = [[29, 17.5], [23.5, 21], [18.5, 33], [19.5, 45.5], [24.5, 48], [28.5, 39.5], [32, 27]];
  const tail = pts([[59, 74], [66, 69], [70.5, 60.5], [73.5, 58.5], [74.5, 62], [71.5, 70.5], [63, 78.5]]);
  return [
    ...bodyParts({ fur, belly: cream, feet: cream, back: solid(tail, fur, { shine: false }) }),
    ...solid(FRAME.head, fur),
    ...flat(ell(57.5, 32.5, 7.6, 8), brown.b),
    ...solid(ell(48, 44, 11.5, 7.8), cream),
    ...solid(pts(earL), brown, { shine: false }),
    ...solid(pts(mirror(earL)), brown, { shine: false }),
    ...eyes({ y: 32.5 }),
    ...stroke("M34.5 25.5Q39 23.2 43 25.2"),
    ...stroke("M53 25.2Q57 23.2 61.5 25.5"),
    ...flat(ell(48, 51, 2.8, 2.4), "#ff7f96", { line: true }),
    ...stroke("M42 47.5Q45 50.8 48 47.6Q51 50.8 54 47.5"),
    ...flat(pts([[43.6, 39.6], [52.4, 39.6], [50.6, 43.2], [48, 44.4], [45.4, 43.2]]), INK),
    ...flat(ell(46.3, 40.6, 1.4, 0.8), "#ffffff", { op: 0.8 }),
    ...cheeks(43.5),
  ];
}

// Mochi: a snow-white bunny with tall pink-lined ears, a button nose, buck
// teeth and big pink feet.
function mochi() {
  const fur = { b: "#f8f3ff", l: "#ffffff", d: "#d8cbef" };
  const pink = { b: "#ffb3c8", l: "#ffd6e2", d: "#ee8eaa" };
  const earL = [[37.5, 16], [32.5, 2], [32.5, -10], [37, -15.5], [41.5, -10], [43, 3], [42.5, 15]];
  const innerL = [[38, 9], [35.2, -0.5], [35.4, -8.5], [37.4, -11.5], [39.6, -8], [40.4, 1], [40.2, 9]];
  return [
    ...solid(pts(earL), fur, { shine: false }),
    ...flat(pts(innerL), pink.b),
    ...solid(pts(mirror(earL)), fur, { shine: false }),
    ...flat(pts(mirror(innerL)), pink.b),
    ...bodyParts({ fur, belly: pink, feet: pink }),
    ...solid(FRAME.head, fur),
    ...eyes({ y: 33, look: [0.6, 1] }),
    ...flat(pts([[45.2, 40.2], [50.8, 40.2], [48, 43.4]]), pink.d, { line: true }),
    ...stroke("M48 43.4L48 45.6"),
    ...stroke("M43.5 45.2Q45.8 48 48 45.6Q50.2 48 52.5 45.2"),
    ...flat(pts([[46, 46.4], [50, 46.4], [50, 49.6], [46, 49.6]]), "#ffffff", { line: true }),
    ...stroke("M48 46.6L48 49.4", { sw: 0.8 }),
    ...stroke("M27 41.5L33.5 42.4", { sw: 0.8 }),
    ...stroke("M27 44.8L33.5 44", { sw: 0.8 }),
    ...stroke("M69 41.5L62.5 42.4", { sw: 0.8 }),
    ...stroke("M69 44.8L62.5 44", { sw: 0.8 }),
    ...cheeks(40.5),
  ];
}

// Pip: a round navy penguin with a white heart-shaped face, an orange beak
// and orange feet.
function pip() {
  const navy = { b: "#33417a", l: "#5163a3", d: "#212b57" };
  const white = { b: "#f8fbff", l: "#ffffff", d: "#d6e0ef" };
  const orange = { b: "#ffa33d", l: "#ffc988", d: "#e07a14" };
  const face = [[48, 22.5], [55.5, 17.5], [64.5, 21], [68.5, 31.5], [65, 44.5], [56, 51.5], [48, 53], [40, 51.5], [31, 44.5], [27.5, 31.5], [31.5, 21], [40.5, 17.5]];
  return [
    ...bodyParts({ fur: navy, feet: orange, legs: navy, belly: white }),
    ...solid(FRAME.head, navy),
    ...solid(pts(face), white),
    ...eyes({ y: 33.5, rx: 4, ry: 5 }),
    ...solid(pts([[42.5, 40.5], [53.5, 40.5], [50.5, 44.8], [48, 46], [45.5, 44.8]]), orange, { shine: false }),
    ...stroke("M43.5 42.6Q48 43.8 52.5 42.6", { sw: 0.9 }),
    ...cheeks(43),
    ...stroke("M45.5 15.5Q48 11 50 16", { sw: 1.6 }),
  ];
}

// Bolt: a friendly teal robot with a screen face, a bobble antenna, bolt
// ears and a blinking chest panel.
function bolt() {
  const metal = { b: "#8fd4e0", l: "#c8f2f8", d: "#5aa7b8" };
  const steel = { b: "#b6c2d1", l: "#dde5ee", d: "#8492a6" };
  const screen = { b: "#26325a", l: "#3b4a7a", d: "#161f3b" };
  const glow = "#7af6ff";
  const head = box(23.5, 13, 72.5, 55, 9);
  return [
    ...stroke("M48 13L48 4.5", { sw: 1.6 }),
    ...solid(ell(48, 3.5, 3.2), { b: "#ff5a6e", l: "#ffa3ae", d: "#d23a4f" }),
    ...bodyParts({ fur: metal, hands: steel, legs: steel, feet: screen }),
    ...solid(box(40.5, 61.5, 55.5, 73.5, 2.2), screen, { shine: false }),
    ...flat(ell(44.5, 67.5, 1.6), "#ff6b7d"),
    ...flat(ell(48, 67.5, 1.6), "#ffd25a"),
    ...flat(ell(51.5, 67.5, 1.6), "#6ff0a0"),
    ...solid(ell(22.5, 34, 3.2, 4.4), steel, { shine: false }),
    ...solid(ell(73.5, 34, 3.2, 4.4), steel, { shine: false }),
    ...solid(head, metal),
    ...solid(box(29.5, 20, 66.5, 48, 6), screen, { shine: false }),
    ...flat(ell(38, 25, 4.5, 1.6), screen.l, { op: 0.7 }),
    ...[39, 57].flatMap((x) => [
      ...flat(ell(x, 32.5, 3.6, 4.6), glow),
      ...flat(ell(x + 1, 31.2, 1.1, 1.3), "#ffffff"),
    ]),
    ...stroke("M42 40.5Q48 45.5 54 40.5", { color: glow, sw: 1.6 }),
    ...cheeks(40.5, "#ff7fb2"),
  ];
}

export const cartoonCharacters = {
  biscuit: { shapes: biscuit() },
  mochi: { shapes: mochi() },
  pip: { shapes: pip() },
  bolt: { shapes: bolt() },
};

// ---------------------------------------------------------------------------
// Wardrobe
// ---------------------------------------------------------------------------

function propellerCap() {
  const red = { b: "#ff5a5f", l: "#ff9a9d", d: "#d63a44" };
  const yellow = { b: "#ffd23f", l: "#ffe98c", d: "#e0aa1c" };
  const blue = { b: "#3d8bff", l: "#8ab9ff", d: "#2a63c9" };
  return wearable({
    front: [
      ...stroke("M48 9L48 3.5", { sw: 1.6 }),
      ...solid(ell(41, 3, 7, 1.9), blue, { shine: false }),
      ...solid(ell(55, 3, 7, 1.9), red, { shine: false }),
      ...solid(ell(48, 3, 1.7), yellow, { shine: false }),
      ...solid(pts([[26.5, 23.5], [28.5, 15.5], [36.5, 9.5], [48, 7.5], [59.5, 9.5], [67.5, 15.5], [69.5, 23.5], [48, 25]]), red),
      ...flat(pts([[40, 9], [48, 7.6], [56, 9], [54, 24.6], [42, 24.6]]), yellow.b),
      ...stroke("M40 9.1L42 24.6"),
      ...stroke("M56 9.1L54 24.6"),
      ...solid(pts([[24, 22.5], [48, 25.5], [72, 22.5], [73, 26], [48, 30], [23, 26]]), blue, { shine: false }),
    ],
    y: -2.5,
  });
}

// Party Hat: a striped cone with a pom-pom, worn at a jaunty tilt.
function partyHat() {
  const pink = { b: "#ff6fb5", l: "#ffb0d8", d: "#d94792" };
  const cone = [[37, 20.5], [50.5, -7], [60.5, 18.5], [49, 22.5]];
  return wearable({
    front: [
      ...solid({ ...pts(cone), straight: true }, pink),
      ...flat({ ...pts([[41.5, 11.5], [46.5, 1.5], [50.2, 2.6], [44.4, 13.8]]), straight: true }, "#ffe45c"),
      ...flat({ ...pts([[47.3, 17.7], [52.4, 7.8], [55.3, 9.4], [50.8, 19.6]]), straight: true }, "#ffe45c"),
      ...flat({ ...pts(cone), straight: true }, "none", { line: true }),
      ...solid(ell(50.5, -7.5, 3.6), { b: "#5ad0ff", l: "#b5edff", d: "#2ea6d6" }),
    ],
  });
}

// Bubble Headphones: a mint band with big round pink cups.
function bubbleHeadphones() {
  const pink = { b: "#ff8fb1", l: "#ffc4d6", d: "#e0668d" };
  const mint = { b: "#7fe3c4", l: "#c2f6e5", d: "#4fbf9d" };
  return wearable({
    front: [
      ...stroke("M23 34C21 5 75 5 73 34", { color: INK, sw: 5.4 }),
      ...stroke("M23 34C21 5 75 5 73 34", { color: mint.b, sw: 3 }),
      ...solid(ell(23, 36, 5.6, 8), pink),
      ...solid(ell(73, 36, 5.6, 8), pink),
      ...flat(ell(23, 36, 2.6, 4.6), mint.b, { line: true }),
      ...flat(ell(73, 36, 2.6, 4.6), mint.b, { line: true }),
    ],
  });
}

// Star Shades: gold star-shaped frames with dark, glinting lenses.
function starShades() {
  const star = (cx, cy, R, r) =>
    Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r : R;
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    });
  const gold = { b: "#ffcf3a", l: "#fff0a0", d: "#dda417" };
  return wearable({
    front: [
      ...stroke("M45 31.5Q48 29.5 51 31.5", { sw: 2.2 }),
      ...[39, 57].flatMap((x) => [
        ...solid({ ...pts(star(x, 33.5, 10, 5.2)), straight: true }, gold, { shine: false }),
        ...flat({ ...pts(star(x, 33.5, 6.8, 3.6)), straight: true }, "#2b2f52"),
        ...flat(ell(x - 2, 31.6, 1.6, 1), "#ffffff", { op: 0.8 }),
      ]),
    ],
  });
}

// Polka Bow Tie: a red bow tie with white dots, at the neck.
function bowTie() {
  const red = { b: "#e8384f", l: "#ff7a8a", d: "#b8223a" };
  const wingL = [[47, 57.5], [39, 52.5], [37.5, 57.5], [39, 62.5]];
  return wearable({
    front: [
      ...solid({ ...pts(wingL), straight: true }, red, { shine: false }),
      ...solid({ ...pts(mirror(wingL)), straight: true }, red, { shine: false }),
      ...[[40.6, 55.4], [41.2, 59.8], [55.4, 55.4], [54.8, 59.8]].flatMap(([x, y]) => flat(ell(x, y, 0.9), "#ffffff")),
      ...solid(box(45.5, 54.8, 50.5, 60.2, 1.6), red, { shine: false }),
    ],
  });
}

// Denim Overalls: a bib with gold buttons, shoulder straps and rolled cuffs.
function overalls() {
  const denim = { b: "#4a7fd0", l: "#86adeb", d: "#335ea6" };
  const cuff = { b: "#6f9be0", l: "#a6c4f0", d: "#4e79bf" };
  const strap = (x0, x1) => [[x0, 55.5], [x0 + 3.5, 55.5], [x1 + 3, 64.5], [x1, 64.5]];
  return wearable({
    front: [
      ...solid(pts([[33, 66.5], [63, 66.5], [63.6, 74], [58, 79.5], [38, 79.5], [32.4, 74]]), denim, { shine: false }),
      ...solid(box(37.5, 74, 47, 84, 2.5), denim, { shine: false }),
      ...solid(box(49, 74, 58.5, 84, 2.5), denim, { shine: false }),
      ...solid(box(37.2, 81.2, 47.3, 84.8, 1.4), cuff, { shine: false }),
      ...solid(box(48.7, 81.2, 58.8, 84.8, 1.4), cuff, { shine: false }),
      ...solid(box(39.5, 61.5, 56.5, 73, 2.5), denim, { shine: false }),
      ...flat(box(44, 64.5, 52, 69.5, 1.2), denim.d, { line: true }),
      ...solid({ ...pts(strap(37, 39.5)), straight: true }, denim, { shine: false }),
      ...solid({ ...pts(strap(55.5, 53)), straight: true }, denim, { shine: false }),
      ...[41.2, 54.8].flatMap((x) => solid(ell(x, 63.6, 1.5), { b: "#ffd23f", l: "#fff0a0", d: "#d9a514" }, { shine: false })),
      ...stroke("M42 76L42 80M54 76L54 80", { color: "#2b4f8f", sw: 0.8 }),
    ],
  });
}

// Hero Cape: a red cape behind, with a gold star clasp at the collar.
function heroCape() {
  const red = { b: "#e8384f", l: "#ff7a8a", d: "#b8223a" };
  const gold = { b: "#ffcf3a", l: "#fff0a0", d: "#dda417" };
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? 1.6 : 3.4;
    return [48 + Math.cos(a) * rad, 57.5 + Math.sin(a) * rad];
  });
  return wearable({
    back: solid(pts([[35, 55], [61, 55], [70, 72], [76.5, 90.5], [64, 87.5], [48, 91.5], [32, 87.5], [19.5, 90.5], [26, 72]]), red),
    front: [
      ...solid(pts([[35.5, 54.5], [48, 57.5], [60.5, 54.5], [58.5, 59], [48, 61], [37.5, 59]]), red, { shine: false }),
      ...solid({ ...pts(star), straight: true }, gold, { shine: false }),
    ],
  });
}

// Red Balloon: a shiny red balloon on a string, held in the right hand.
function balloon() {
  const red = { b: "#ff4d5e", l: "#ffa0a8", d: "#d22c40" };
  return wearable({
    front: [
      ...stroke("M68.5 71C72 62 76 56 79 49.5C80 47 81.5 45.5 82 44.5", { sw: 0.9 }),
      ...solid(pts([[82, 42], [90.5, 37], [93.5, 26], [88.5, 15], [82, 13], [75.5, 15], [70.5, 26], [73.5, 37]]), red),
      ...flat({ ...pts([[80.3, 44.6], [83.7, 44.6], [82, 41.8]]), straight: true }, red.d, { line: true }),
      ...flat(ell(77.6, 21.5, 2, 3.4), "#ffffff", { op: 0.7 }),
    ],
  });
}

export const cartoonWearables = {
  "propeller-cap": propellerCap(),
  "party-hat": partyHat(),
  "bubble-headphones": bubbleHeadphones(),
  "star-shades": starShades(),
  "polka-bow-tie": bowTie(),
  "denim-overalls": overalls(),
  "hero-cape": heroCape(),
  "red-balloon": balloon(),
};
