// Brainrot pack art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
// Four ORIGINAL absurd mash-up creatures in the spirit of the brainrot meme
// genre (everyday object + animal + a sing-song pseudo-Italian name). None of
// them copy an existing meme character. Keep it that way when adding to this
// pack: the viral characters are other people's creations, and some of their
// names have trademark filings. The wardrobe fits all four.

import { INK, bodyParts, boundsOf, box, cheeks, ell, eyes, flat, FRAME, mirror, poly, pts, solid, star, stroke, tube, wearable } from "./vectorKit.js";

const GOLD = { b: "#ffc93c", l: "#fff0a0", d: "#d99a14" };
const WHITE = { b: "#ffffff", l: "#ffffff", d: "#dfe1ee" };
const CHROME = { b: "#d4dce8", l: "#f6f9fd", d: "#9aa6ba" };

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

// Toastolino Ranocchio: a frog whose head is a chrome toaster, two slices
// of toast popping out of the top and frog eyes bulging from the front.
function toastolino() {
  const frog = { b: "#6cc44a", l: "#a6e68a", d: "#479a2c" };
  const belly = { b: "#e4f7b8", l: "#ffffff", d: "#c4e08a" };
  const bread = { b: "#f2c27a", l: "#ffe1ad", d: "#d39a48" };
  const crust = "#b8742e";
  return [
    ...[[31, 45], [51, 65]].flatMap(([x0, x1]) => [
      ...solid(box(x0, 3, x1, 20, 4), bread, { shine: false }),
      ...flat(box(x0 + 2.2, 5.2, x1 - 2.2, 20, 2.4), "#ffe9c4"),
      ...stroke(`M${x0 + 0.8} 7Q${x0} 3.2 ${x0 + 4} 3.2L${x1 - 4} 3.2Q${x1} 3.2 ${x1 - 0.8} 7`, { color: crust, sw: 1 }),
    ]),
    ...bodyParts({ fur: frog, belly, feet: frog }),
    ...solid(box(72, 30, 77, 36, 1.5), { b: "#2d2440", l: "#4a4063", d: "#1a1528" }, { shine: false }),
    ...solid(box(23, 15, 73, 56, 9), CHROME),
    ...flat(box(28.5, 14.2, 47.5, 16.6, 1.2), "#4a5268"),
    ...flat(box(48.5, 14.2, 67.5, 16.6, 1.2), "#4a5268"),
    ...stroke("M27 50.5L69 50.5", { color: CHROME.d, sw: 1 }),
    ...[39, 57].flatMap((x) => solid(ell(x, 31, 8.5, 8), frog, { shine: false })),
    ...eyes({ y: 31.5, rx: 4.6, ry: 5.2, look: [-0.6, 0.6] }),
    ...stroke("M33 42.5Q48 50 63 42.5", { sw: 1.6 }),
    ...cheeks(43.5),
  ];
}

// Gelatino Gufino: an owl made of a strawberry scoop on a waffle cone, with
// a cherry on top and sprinkles everywhere.
function gelatino() {
  const scoop = { b: "#ff9cc2", l: "#ffd0e2", d: "#e66f9c" };
  const cone = { b: "#e0a85a", l: "#f2c88a", d: "#b9823a" };
  const orange = { b: "#ffa33d", l: "#ffc988", d: "#e07a14" };
  const head = pts([[23, 34], [25, 22], [34, 14], [48, 11.5], [62, 14], [71, 22], [73, 34], [72, 46], [69, 52], [66, 50], [63, 56], [59, 52], [54, 55], [49, 51], [44, 56.5], [39, 52], [34, 55], [30, 50], [26, 52], [24, 46]]);
  const sprinkles = [[32, 22, "#5ad0ff", 0.6], [62, 20, "#ffe45c", -0.5], [27, 40, "#7fe3a0", 1], [68, 40, "#5ad0ff", 0.3], [44, 16, "#7fe3a0", 0.2], [54, 17, "#ff6b7d", -0.9]];
  return [
    ...bodyParts({ fur: cone, feet: orange }),
    ...stroke("M35 60L52 79M42 56L60 76M51 56L63 69M33 70L44 81M61 60L42 80M54 56L36 77M45 56L33 67M63 70L54 80", { color: cone.d, sw: 0.8 }),
    ...solid(head, scoop),
    ...sprinkles.flatMap(([x, y, c, a]) => {
      const dx = 1.6 * Math.cos(a);
      const dy = 1.6 * Math.sin(a);
      return stroke(`M${(x - dx).toFixed(2)} ${(y - dy).toFixed(2)}L${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`, { color: c, sw: 1.3 });
    }),
    ...[38.5, 57.5].flatMap((x) => [
      ...flat(ell(x, 33, 8, 8), orange.b, { line: true }),
      ...flat(ell(x, 33, 5.6, 5.8), "#ffffff", { line: true }),
      ...flat(ell(x + 0.6, 33.6, 3, 3.3), INK),
      ...flat(ell(x + 1.6, 32.2, 1.1, 1.2), "#ffffff"),
    ]),
    ...solid(poly([[44.6, 40.5], [51.4, 40.5], [48, 46.5]]), orange, { shine: false }),
    ...cheeks(44, "#ff6f9f"),
    ...stroke("M48 4.5Q49.5 0.5 53 -1", { color: "#4f8a2e", sw: 1.3 }),
    ...solid(ell(48, 8, 4.4), { b: "#e8243c", l: "#ff7a8a", d: "#b01228" }),
  ];
}

// Lavatrice Gattina: a tabby cat whose head is a washing machine, peeking
// out through a porthole full of soap bubbles.
function lavatrice() {
  const tabby = { b: "#a7a9bd", l: "#cdd0e0", d: "#7c7e96" };
  const water = { b: "#7ec8ff", l: "#c2e6ff", d: "#4a9ee0" };
  const earL = [[25, 19], [27, 2], [41, 14]];
  const innerL = [[28, 15], [28.8, 6], [36, 13]];
  const tail = pts([[59, 76], [68, 73], [76, 64], [80, 52], [84, 54], [82, 66], [73, 78], [63, 82]]);
  return [
    ...solid(tail, tabby, { shine: false }),
    ...stroke("M70 72L73.5 75M76 63L80 65.5", { color: tabby.d, sw: 1.4 }),
    ...solid(poly(earL), tabby, { shine: false }),
    ...flat(poly(innerL), "#ffb3c8"),
    ...solid(poly(mirror(earL)), tabby, { shine: false }),
    ...flat(poly(mirror(innerL)), "#ffb3c8"),
    ...bodyParts({ fur: tabby, belly: WHITE, feet: WHITE }),
    ...stroke("M36 59L40 61M60 59L56 61M34 66L38 67M62 66L58 67", { color: tabby.d, sw: 1.4 }),
    ...solid(box(23, 13, 73, 56, 6), WHITE),
    ...flat(box(26.5, 16, 69.5, 22.5, 2), "#e6e9f2", { line: true }),
    ...flat(box(29, 17.4, 41, 21.1, 0.8), "#26325a"),
    ...flat(box(30, 18.4, 36, 20.1, 0.4), "#6ff0a0"),
    ...solid(ell(59, 19.25, 2.4), CHROME, { shine: false }),
    ...solid(ell(65.5, 19.25, 2.4), CHROME, { shine: false }),
    ...solid(ell(48, 39.5, 14, 13.5), CHROME, { shine: false }),
    ...solid(ell(48, 39.5, 10.6, 10.2), water, { shine: false }),
    ...[42.5, 53.5].flatMap((x) => [
      ...flat(ell(x, 37, 3, 3.6), "#ffffff", { line: true }),
      ...flat(ell(x + 0.4, 37.4, 1.6, 2.4), INK),
      ...flat(ell(x + 1.1, 36.3, 0.6, 0.7), "#ffffff"),
    ]),
    ...flat(poly([[46.8, 41.2], [49.2, 41.2], [48, 42.6]]), "#ff7f96"),
    ...stroke("M45.5 43.6Q46.8 45 48 43.6Q49.2 45 50.5 43.6", { sw: 0.9 }),
    ...flat(ell(42, 33.5, 2.4, 1.2), "#ffffff", { op: 0.7 }),
    ...[[44, 47, 1.1], [41, 44, 0.8], [53.5, 46.5, 1.3], [56, 43.5, 0.8]].flatMap(([x, y, r]) => flat(ell(x, y, r), "#ffffff", { op: 0.8 })),
    ...stroke("M19 38L30 39.5M19 43L30 42", { sw: 0.8 }),
    ...stroke("M77 38L66 39.5M77 43L66 42", { sw: 0.8 }),
  ];
}

// Pomodoro Pinguino: a penguin with a ripe tomato for a head, a leafy green
// top and an orange beak.
function pomodoro() {
  const tomato = { b: "#ff4d4d", l: "#ff9a8a", d: "#d12e36" };
  const navy = { b: "#33417a", l: "#5163a3", d: "#212b57" };
  const leaf = { b: "#4fbf5a", l: "#8ee69a", d: "#2f8f3b" };
  const orange = { b: "#ffa33d", l: "#ffc988", d: "#e07a14" };
  const calyx = poly(Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 3.2 : 9.5;
    return [48 + Math.cos(a) * r * 1.25, 15 + Math.sin(a) * r * 0.6];
  }));
  return [
    ...bodyParts({ fur: navy, feet: orange, belly: WHITE }),
    ...solid(pts([[48, 15.5], [57, 12.5], [67, 16], [73.5, 27], [74, 40], [68, 51], [58, 56.5], [48, 57.5], [38, 56.5], [28, 51], [22, 40], [22.5, 27], [29, 16], [39, 12.5]]), tomato),
    ...stroke("M48 16Q47 30 48 36", { color: tomato.d, sw: 0.8 }),
    ...solid(calyx, leaf, { shine: false }),
    ...tube("M48 13L49 7", leaf.d, 1.6),
    ...eyes({ y: 33.5 }),
    ...solid(pts([[42.5, 41.5], [53.5, 41.5], [50.5, 45.8], [48, 47], [45.5, 45.8]]), orange, { shine: false }),
    ...stroke("M43.5 43.6Q48 44.8 52.5 43.6", { sw: 0.9 }),
    ...cheeks(43, "#ffd0b0"),
  ];
}

export const brainrotCharacters = {
  toastolino: { shapes: toastolino() },
  gelatino: { shapes: gelatino() },
  lavatrice: { shapes: lavatrice() },
  pomodoro: { shapes: pomodoro() },
};

// ---------------------------------------------------------------------------
// Wardrobe
// ---------------------------------------------------------------------------

// Spaghetti Bowl Hat: a bowl of spaghetti worn as a hat, meatball on top and
// Spaghetti Bowl Hat: an upturned bowl of spaghetti worn like a helmet,
// strands dangling down the sides, a meatball on top and a fork stuck in.
function spaghettiHat() {
  const pasta = { b: "#ffd86b", l: "#fff0b0", d: "#e6b43a" };
  const sauce = { b: "#e8432e", l: "#ff8a70", d: "#b82a1a" };
  const strand = (d) => tube(d, pasta.b, 1.3);
  return wearable({
    front: [
      ...tube("M57 4L66 -8", CHROME.b, 1.5),
      ...stroke("M64 -9.5L66 -13M65.8 -8.3L68.4 -11.4M67.4 -7L70.4 -9.8", { sw: 1 }),
      ...solid(pts([[24, 25], [26, 15], [34, 7.5], [48, 5], [62, 7.5], [70, 15], [72, 25], [48, 22.5]]), WHITE),
      ...stroke("M27 17Q48 9.5 69 17", { color: "#3d8bff", sw: 1.6 }),
      ...solid(pts([[37, 8], [42, 3], [48, 4.5], [54, 2.5], [59, 7], [54, 9], [48, 8], [42, 9.5]]), sauce, { shine: false }),
      ...solid(ell(48.5, 2.5, 4.4, 4), { b: "#8a4a2a", l: "#b06c44", d: "#5e2e16" }),
      ...solid(pts([[22.5, 23.5], [48, 21], [73.5, 23.5], [74, 27.5], [48, 25.5], [22, 27.5]]), pasta, { shine: false }),
      ...strand("M24.5 26Q21.5 31 24 35Q26.5 39 23.5 44"),
      ...strand("M71.5 26Q74.5 31 72 35Q69.5 39 72.5 44"),
    ],
  });
}

// Maestro Moustache: a curly black handlebar moustache. It sits under each
// character's own nose or beak (and fits inside Lavatrice's porthole).
function maestroMoustache() {
  const tone = { b: "#2a2030", l: "#4a3e54", d: "#160f1c" };
  const half = [[48, 42], [44, 40.6], [38.5, 41.3], [33.5, 40.4], [30.5, 37.2], [28.6, 38.8], [30.5, 42.8], [36, 45.2], [42, 44.8], [48, 43.8]];
  // Shrunk by `s` around (48, cy).
  const draw = (s = 1, cy = 42.5) => {
    const fit = (list) => list.map(([x, y]) => [48 + (x - 48) * s, cy + (y - 42.5) * s]);
    return [...solid(pts(fit(half)), tone, { shine: false }), ...solid(pts(fit(mirror(half))), tone, { shine: false })];
  };
  const small = draw(0.42, 45.6);
  return {
    ...wearable({ front: draw() }),
    perCharacter: {
      toastolino: { y: 1.5 },
      gelatino: { y: 5.5 },
      pomodoro: { y: 5 },
      lavatrice: { front: small, bounds: boundsOf(small) },
    },
  };
}

// Drip Tracksuit: a shiny purple tracksuit with white side stripes and a
// gold zip.
function dripTracksuit() {
  const purple = { b: "#8a3ee0", l: "#b67cf5", d: "#6224b0" };
  return wearable({
    front: [
      ...solid(box(37.5, 74, 47, 87, 2.5), purple, { shine: false }),
      ...solid(box(49, 74, 58.5, 87, 2.5), purple, { shine: false }),
      ...stroke("M39.5 75L39.5 86.5M56.5 75L56.5 86.5", { color: "#ffffff", sw: 1.2 }),
      ...solid(FRAME.body, purple),
      ...solid(FRAME.armL, purple, { shine: false }),
      ...solid(FRAME.armR, purple, { shine: false }),
      ...stroke("M35.5 58.5L29.6 67.6M60.5 58.5L66.4 67.6", { color: "#ffffff", sw: 1.2 }),
      ...solid(pts([[40, 55.5], [48, 59.5], [56, 55.5], [54.5, 54], [48, 56.5], [41.5, 54]]), purple, { shine: false }),
      ...stroke("M48 59.5L48 81", { color: GOLD.b, sw: 1.2 }),
      ...solid(box(46.6, 61, 49.4, 64.5, 0.6), GOLD, { shine: false }),
    ],
  });
}

// Big Gold Chain: chunky gold links with a gem medallion.
function goldChain() {
  const link = (x, y) => tube(`M${x - 1.9} ${y}C${x - 1.9} ${y - 1.9} ${x + 1.9} ${y - 1.9} ${x + 1.9} ${y}C${x + 1.9} ${y + 1.9} ${x - 1.9} ${y + 1.9} ${x - 1.9} ${y}`, GOLD.b, 1.1);
  const path = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const x = 37.5 + t * 21;
    const y = 55.8 + Math.sin(t * Math.PI) * 8;
    return [x, y];
  });
  return wearable({
    front: [
      ...path.flatMap(([x, y]) => link(x, y)),
      ...solid(ell(48, 67, 5), GOLD),
      ...solid(poly([[48, 63.8], [51, 67], [48, 70.2], [45, 67]]), { b: "#ff5fa8", l: "#ffb0d4", d: "#d23a84" }, { shine: false }),
    ],
  });
}

// Pizza Backpack: a pizza box slung on the back, wider than the body, with
// a slice sneaking out of the corner.
function pizzaBackpack() {
  const card = { b: "#d9a46a", l: "#f0c48e", d: "#b07c44" };
  const slice = poly([[70, 52], [88, 40], [86, 54]]);
  return wearable({
    back: [
      ...solid(box(19, 50, 77, 84, 2.5), card),
      ...stroke("M21 55L75 55", { color: card.d, sw: 1 }),
      ...solid(slice, { b: "#ffd86b", l: "#fff0b0", d: "#e6b43a" }, { shine: false }),
      ...stroke("M88 40L86 54", { color: "#c8823a", sw: 2.4 }),
      ...flat(ell(81, 47.5, 1.6), "#e8432e"),
      ...flat(ell(78, 51, 1.3), "#e8432e"),
    ],
    front: [...tube("M37 56L39 70M59 56L57 70", "#8a5a2e", 1.8)],
  });
}

// Tiny Espresso: a little cup of espresso on a saucer, steaming.
function tinyEspresso() {
  return wearable({
    front: [
      ...stroke("M70 55Q68 52 70 49Q72 46 70 43M74.5 55Q72.5 52 74.5 49", { color: "#c9cbe0", sw: 1.1 }),
      ...solid(ell(72, 67.5, 8, 2.2), WHITE, { shine: false }),
      ...solid(pts([[66, 57.5], [78, 57.5], [77, 63.5], [74, 66.5], [70, 66.5], [67, 63.5]]), WHITE, { shine: false }),
      ...flat(ell(72, 58, 5.6, 1.4), "#5a3220"),
      ...tube("M78 59.5C82 59 82 64 77.4 63.5", WHITE.b, 1.2),
    ],
  });
}

// Infinite Aura: purple aura flames rising behind and floating sparkles.
function infiniteAura() {
  const flame = (x, h, w) => pts([[x - w, 92], [x - w * 0.8, 92 - h * 0.5], [x - w * 0.2, 92 - h * 0.8], [x, 92 - h], [x + w * 0.3, 92 - h * 0.7], [x + w, 92 - h * 0.4], [x + w * 0.9, 92]]);
  const sparkle = (x, y, r) => stroke(`M${x - r} ${y}L${x + r} ${y}M${x} ${y - r}L${x} ${y + r}`, { color: "#fff07a", sw: 1.4 });
  return wearable({
    back: [
      ...[[16, 54, 9], [26, 72, 9], [70, 72, 9], [80, 54, 9], [48, 84, 14]].flatMap(([x, h, w]) => flat(flame(x, h, w), "#b05cff", { op: 0.45 })),
      ...[[18, 40, 6], [28, 58, 6], [68, 58, 6], [78, 40, 6]].flatMap(([x, h, w]) => flat(flame(x, h, w), "#ff7ae0", { op: 0.5 })),
    ],
    front: [...sparkle(10, 20, 3), ...sparkle(88, 28, 2.5), ...sparkle(86, 70, 3), ...sparkle(8, 60, 2.2), ...flat(star(80, 10, 3.4), GOLD.b, { line: true })],
  });
}

export const brainrotWearables = {
  "spaghetti-hat": spaghettiHat(),
  "maestro-moustache": maestroMoustache(),
  "drip-tracksuit": dripTracksuit(),
  "gold-chain": goldChain(),
  "pizza-backpack": pizzaBackpack(),
  "tiny-espresso": tinyEspresso(),
  "infinite-aura": infiniteAura(),
};
