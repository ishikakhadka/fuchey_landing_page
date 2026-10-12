// Wearable pixel art, drawn on the Yeti's native 96×96 grid.
//
// yeti.png is 96×96 pixel art scaled ×4. Every wearable here is drawn in
// those same grid coordinates, so layering it over the base character lines
// up pixel-for-pixel — no per-item CSS nudging. Rows may go negative (above
// the head) for hats and halos; renderers leave headroom for that.
//
// Each wearable has a `front` layer (drawn over the character) and optionally
// a `back` layer (drawn behind it, e.g. the backpack's bag). Card icons are
// the same layers cropped to their bounding box, unless the wearable has its
// own `icon` layer (outfits: shown whole, without the gap the beard covers).
//
// Plain data + functions (the pixel canvas lives in pixel.js). Source art only: build-seed.mjs stores
// the generated layers in the database (wearables.visual), and nft/make-art.mjs
// renders the NFT PNGs from it. The site draws from the database, not this file.

import { OUTLINE, canvas, ellipse, erase, layer, line, part, polygon, roundRect, stamp } from "./pixel.js";
import { anchors } from "./sprites.js";

// yeti.png rows 20–94 as brightness bands: '#' outline, 'o' dark, '+' mid,
// '.' light shade, '_' white fur, ' ' empty. Outfits are fitted to this map:
// they cover the torso and arms the way the fur does, inherit its shading
// (folds, arm creases), and stop at the beard, which hangs over them.
const BODY_TOP = 20;
const BODY = [
  "                         ##.._#oooo##______##__#####ooo##___..####",
  "                         ##.__###o##_______#.+__...###o#____._#",
  "                          #_____###______####+__.....##____.__#",
  "                          #_____#__._____##+#+____....#____._##",
  "                          #_____#_..____+#.+###___....#__._._##",
  "                        ###_.___#...___##..+++##___...#__.___#_##",
  "                       #oo##..__#...___#....+++#____..#__.___#__###",
  "                     ###oo##..__#....##.......++#__...#__.._##___###",
  "                     ##++o##..__#####...___.....#######__.__#__+...+#",
  "                    #__++oo#_.______________.........____._##__.+.++#",
  "                    #__++oo#_._______________..........__._#___....+##",
  "                   ##__++oo#____________________......__.+_#_+......_#",
  "                   ##___+oo##___________________________++##_+....____#",
  "                   ##___+.o###________________________..+##__+________#",
  "                   #___.++o###_______________________...+#_+++________##",
  "                  ##___..+o#o##______________________..+##..++_________#",
  "                  #____.+oo#o###____________________..++##+++__________#",
  "                  #___...oo#o###___________________..++###++___________#",
  "                 ##___..+.o#oo###_________________..++####++___________#",
  "                 #____..++##ooo###______________...++#####______________#",
  "                 #___..+++#_#oo####____________..+.++#####______________#",
  "                ##___..+.+#_#oo#####__________.+++++####.#______________#",
  "                #____...+##_#ooo#####________..++..#####.#______________#",
  "                #___..++.#__#oo+#####_______..++++#####..#_______________#",
  "                #___..++.#__#oo++#####______....+.#####..#____________+__#",
  "               #____.+..##___#oo++#####_____...++###+##..#____________.__#",
  "               #____..++#____##oo++#####____..+####o.#_..#____________+._#",
  "              ##____.++.#_____##o+++#####___..####o+##..##____________.._##",
  "              #_____++.+#______##o+++############o+##_.##_____________+.__#",
  "              #____.+++##_______##o+++#########o++##_..#______________..__# _",
  "              #____.+++#_________##ooo+#######o++##_...#______________+.._#",
  "             ##____.++.#__________##o+oooooo++++##__...#______________+.._#",
  "             #____..+++#_____._.___##+++ooo+++###__....#_____________.+...#",
  "             #____..+++#_____._..___###+++++###____....#_____________++...#",
  "             #____..+++#_____......___#######______....#____________+.+...#",
  "            ##____..+++#_____......_________......_..+##____________+++...#",
  "            #_____..+++#______.______________...___..+#_____________+++..+#",
  "            #_____..++++#__________________________.++#____________+++...+#",
  "            #_____..++++#______________________..__.++#____________++..+++#",
  "            #_____..++++#______________________...._++#__________+++++.++##",
  "            #_____..++++#______________________...._++#__________++++.+++##",
  "             #____..++++#_____________oo___________.++#_________+++++.+++#",
  "             #_###..++++##____________oo.___________++#_________++++++++#",
  "             ###o##.+++++#____________oo.___________++#________++++++++##",
  "              ##oo##.++++##___________oooo__________++##____###++++++++#",
  "               #oo.+#.....#___________..ooo_________++o#___#oo###++#+###",
  "               #oo+.##....#___________..+oo_________o++#___#++oo####ooo##",
  "               ##o+#####..#___________..oo##________oo+##__#++oooo##ooo##",
  "                #o.########___________..+oo#________oo+###_#++oooooooooo#",
  "                #o+########___________..+oo##_______ooo#####++oooooooo+o#",
  "                #..########___________..++o###______ooo#####++++o+++++++#",
  "                #oo########___________..++o#_#_______oo#####++++++#++#+#_",
  "                 ##########___________..++o#_#_______oo#####+++#++#++#+#",
  "                   ########_._________..++o#_#_______.ooo###+++#++#++#+#",
  "                    #######_....._____..++o#_#________ooooo#+++#++#++###",
  "                    #######_....._____..+++#_#________.oooo###########",
  "                          #__...._____..+++#_#___._____.ooooooooo#",
  "                          #__.________..+++#_#___....._...ooooooo#",
  "                          #___________..+++#_#___.....__...oooooo#       _",
  "                          #___________..+++#_#____________.....__#       _",
  "                          #___________..+++#_#___________________#",  "                          #__.________..+++#_#___________________#",
  "                          #__..._.____..+++#_#____________..._.._#",
  "                          #__....____..++++#_#_____________....._#",
  "                          #__________..++++#_#__##_______________#",
  "                         ##_______#_...++++#_#__##_______#_______#",
  "                         #______####..+++++#_#_###_______##______#",
  "                         #_____#####...##++#_###o#___###_#o#_____#",
  "                        #########o###.#oo#+#_##oo#__##o###o#######",
  "                        #ooo###oooo####+o###_##oo####oooooo#ooooo##_",
  "                       ##oooooooo++++o++ooo#_##ooo##oo+oo.+#.+.o#o#_",
  "                       #oo++oo+#o...++#o#oo#_##oo+++.#.+.++++.+.+o#_",
  "                       #o++#o++#++..#+.o+++#_###o..++##..+##.+#..##_",
  "                       ##++#o++#+++######.+#_######+.##########.+##",
  "                        ####################_######################",
];

const band = (x, y) => BODY[y - BODY_TOP]?.[x] ?? " ";

// Flood-fill the fur between outlines, starting from seed pixels.
function region(seeds, y0, y1) {
  const out = new Set();
  const stack = [...seeds];
  while (stack.length) {
    const [x, y] = stack.pop();
    const k = `${x},${y}`;
    if (out.has(k) || y < y0 || y > y1) continue;
    const b = band(x, y);
    if (b === " " || b === "#") continue;
    out.add(k);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

// Body parts on the 96×96 grid (outline pixels excluded).
const PART = {
  torso: region([[30, 50], [50, 50]], 24, 70),
  leftArm: region([[17, 45]], 24, 61),
  rightArm: region([[62, 45]], 24, 63),
};

const mixRows = (stops) => (x, y) => {
  // stops: [[row, colour], …] sorted by row; picks the last stop ≤ y
  let c = stops[0][1];
  for (const [row, colour] of stops) if (y >= row) c = colour;
  return c;
};

// ---------------------------------------------------------------------------
// Wearables
// ---------------------------------------------------------------------------

function beanie() {
  const p = canvas();
  const base = "#3f78b5";
  const dome = [[-7, 5], [-6, 8], [-5, 10], [-4, 12], [-3, 13], [-2, 14], [-1, 14], [0, 14], [1, 14]];
  dome.forEach(([y, w]) => p.span(y, 44 - w, 43 + w, base));
  p.shade({ light: "#6fa3d9", dark: "#2c5a8c" });
  p.span(-4, 36, 38, "#9cc4ea");
  p.span(-3, 34, 35, "#9cc4ea");
  // Ribbed brim
  for (let y = 2; y <= 6; y++) p.span(y, 27, 60, (x) => (x % 2 ? "#2f5f94" : "#4a86c4"));
  p.span(2, 27, 60, (x) => (x % 2 ? "#3c6fa6" : "#6297cf"));
  // Pom-pom
  [[-13, 2], [-12, 3], [-11, 3], [-10, 3], [-9, 3], [-8, 2]].forEach(([y, w]) =>
    p.span(y, 44 - w, 43 + w, "#f4f8fb"),
  );
  p.span(-12, 41, 42, "#ffffff");
  p.span(-9, 45, 46, "#cfdde8");
  p.span(-8, 43, 45, "#cfdde8");
  p.outline();
  return { front: p };
}

function crown() {
  const p = canvas();
  const gold = "#f2c14e";
  // Spikes: [centre, top row]
  [[34, -6], [39, -8], [44, -10], [49, -8], [54, -6]].forEach(([c, top]) => {
    for (let y = top; y <= -3; y++) {
      const h = Math.floor((y - top) / 2);
      p.span(y, c - h - 1, c + h, gold);
    }
  });
  p.rect(32, -2, 55, 2, gold);
  p.shade({ light: "#ffe597", dark: "#c48d2c" });
  p.span(1, 32, 55, "#c48d2c");
  p.span(-2, 33, 54, "#ffe597");
  // Gems on the band and spike tips
  [[36, -1], [43, -1], [50, -1]].forEach(([x, y]) => {
    p.rect(x, y, x + 1, y + 1, "#6fd0ea");
    p.set(x, y, "#e8fbff");
  });
  [[33, -7], [38, -9], [43, -11], [48, -9], [53, -7]].forEach(([x, y]) => {
    p.rect(x, y, x + 1, y, "#6fd0ea");
    p.set(x, y, "#e8fbff");
  });
  p.outline("#4a3110");
  return { front: p };
}

function headphones() {
  const p = canvas();
  // Band: ring around the top of the head
  for (let y = -5; y <= 11; y++) {
    for (let x = 18; x <= 70; x++) {
      const d = Math.hypot(x - 43.5, (y - 16) * 1.05);
      if (d >= 18.4 && d <= 21) p.set(x, y, y < 0 ? "#4d5d73" : "#2b3646");
    }
  }
  p.shade({ light: "#6b7d96", dark: "#1d2531" });
  // Ear cups
  const cup = (x0) => {
    p.rect(x0, 10, x0 + 7, 21, "#f08a64");
    p.span(10, x0 + 1, x0 + 6, "#ffb592");
    p.rect(x0, 11, x0, 20, "#ffb592");
    p.span(21, x0 + 1, x0 + 6, "#c4603f");
    p.rect(x0 + 7, 11, x0 + 7, 20, "#c4603f");
    p.rect(x0 + 2, 13, x0 + 5, 18, "#2b3646");
    p.rect(x0 + 3, 14, x0 + 4, 16, "#38d6ee");
  };
  cup(19);
  cup(61);
  p.outline();
  return { front: p };
}

function visor() {
  const p = canvas();
  p.rect(28, 10, 59, 16, "#0b1220");
  p.span(11, 30, 57, "#7fe9ff");
  p.rect(30, 12, 57, 13, "#38d6ee");
  p.span(14, 30, 57, "#5aa9f5");
  p.span(15, 30, 57, "#9b86ff");
  p.span(12, 33, 36, "#e6fbff");
  p.set(38, 12, "#e6fbff");
  p.span(13, 50, 52, "#e6fbff");
  // Side clips with status LEDs
  p.rect(26, 11, 28, 15, "#1c2638");
  p.rect(59, 11, 61, 15, "#1c2638");
  p.set(27, 13, "#5ee2a0");
  p.set(60, 13, "#f08a64");
  p.outline("#04070d");
  return { front: p };
}

function glasses() {
  const p = canvas();
  const frame = "#ff5fa2";
  const lens = "#1b1030";
  // Lenses
  p.rect(33, 12, 40, 13, lens);
  p.rect(46, 12, 53, 13, lens);
  p.span(14, 34, 39, lens);
  p.span(14, 47, 52, lens);
  p.span(15, 35, 38, lens);
  p.span(15, 48, 51, lens);
  // Frame: top bar, bridge, rims
  p.span(11, 31, 55, frame);
  p.span(12, 41, 45, frame);
  p.outline(frame);
  p.span(11, 31, 55, "#ffa3c9");
  // Glints
  p.set(35, 12, "#ffffff");
  p.set(36, 13, "#ffffff");
  p.set(48, 12, "#ffffff");
  p.set(49, 13, "#ffffff");
  const lowered = canvas();
  for (const pt of p.px.values()) lowered.set(pt.x, pt.y + 2, pt.c);
  return { front: lowered };
}

// Frost Scarf in the device animation's colours (public/fuchey_animation.html:
// coral band, darker coral tail, light stripe blocks). It wraps the neck under
// the mustache, sagging a little in front with its ends tucked behind the
// shoulders, and knots on one side so two striped tails hang over the beard.
function scarf() {
  const p = canvas();
  const coral = "#f08a64";
  const light = "#ffb592";
  const shade = "#d8704e";
  const deep = "#b85a3c";
  const stripe = "#ffd3bf";

  // Wrap: centre line sags 4px in front
  const mid = (x) => 29 + Math.round(4 * (1 - ((x - 43.5) / 21) ** 2));
  for (let x = 22; x <= 65; x++) {
    const c = mid(x);
    for (let y = c - 2; y <= c + 3; y++) p.set(x, y, y === c - 2 ? light : y >= c + 2 ? shade : coral);
    p.set(x, c + 3, deep);
  }
  // Where one turn of the wrap overlaps the next
  [31, 41].forEach((x0) => {
    for (let i = 0; i <= 5; i++) p.set(x0 + i, mid(x0 + i) - 2 + i, deep);
  });
  // Stripe blocks around the wrap
  [25, 35, 45, 58].forEach((x0) => {
    for (let x = x0; x <= x0 + 2; x++) {
      p.set(x, mid(x), stripe);
      p.set(x, mid(x) + 1, stripe);
    }
  });

  // Tails: the back one swings left and is in shadow, the front one hangs
  // longer with a little sway.
  const tail = (x0, y0, y1, drift, cols) => {
    for (let y = y0; y <= y1; y++) {
      const x = x0 + Math.floor((y - y0) / drift.every) * drift.dir;
      const band = (y - y0) % 8;
      const fringe = y >= y1 - 2;
      for (let i = 0; i < 6; i++) {
        let c = i === 5 ? cols.edge : i === 0 ? cols.lit : cols.base;
        if (band === 4 || band === 5) c = cols.stripe;
        if (fringe) c = i % 2 ? cols.edge : cols.stripe;
        p.set(x + i, y, c);
      }
    }
  };
  tail(43, 35, 49, { every: 5, dir: -1 }, { base: shade, lit: coral, edge: deep, stripe: "#f2b79c" });
  tail(50, 35, 55, { every: 7, dir: 1 }, { base: coral, lit: light, edge: shade, stripe });

  // Knot where the tails leave the wrap
  for (let y = 31; y <= 37; y++) {
    const hw = y === 31 || y === 37 ? 2 : 3;
    p.span(y, 52 - hw, 52 + hw, coral);
  }
  p.span(31, 50, 54, light);
  p.span(32, 49, 50, light);
  p.span(37, 50, 54, shade);
  p.rect(55, 33, 55, 36, shade);
  p.set(51, 34, shade);
  p.set(52, 35, shade);

  p.outline("#7a3a24");
  return { front: p };
}

// The Snow Globe from the device's wardrobe screen, set down beside the Yeti
// like a little keepsake.
function snowGlobe() {
  const p = canvas();
  const cx = 80;
  const cy = 81;
  const r = 8.4;
  for (let y = cy - 9; y <= cy + 9; y++) {
    for (let x = cx - 9; x <= cx + 9; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r && y <= cy + 6) p.set(x, y, d > r - 1.2 ? "#9cc8da" : "#d6ecf6");
    }
  }
  // Snowy ground and a tiny pine inside the glass
  p.span(cy + 5, cx - 6, cx + 6, "#ffffff");
  p.span(cy + 6, cx - 5, cx + 5, "#eef6fa");
  const pine = [[0, -5], [-1, -4], [0, -4], [1, -4], [-1, -3], [0, -3], [1, -3], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1]];
  pine.forEach(([dx, dy]) => p.set(cx + dx, cy + dy + 2, dx < 0 ? "#3f8f6b" : "#2f7556"));
  p.set(cx, cy - 3, "#5fb88c");
  p.rect(cx, cy + 4, cx, cy + 4, "#6e5a4a");
  [[-5, -3], [4, -6], [5, -1], [-4, 2], [2, -4], [-2, -6]].forEach(([dx, dy]) => p.set(cx + dx, cy + dy, "#ffffff"));
  // Glint
  p.set(cx - 5, cy - 5, "#ffffff");
  p.set(cx - 6, cy - 4, "#ffffff");
  p.set(cx - 6, cy - 3, "#ffffff");
  // Wooden base sitting on the ground line
  p.span(cy + 7, cx - 7, cx + 7, "#8a6f58");
  p.rect(cx - 8, cy + 8, cx + 8, cy + 10, "#6e5a4a");
  p.span(cy + 11, cx - 7, cx + 7, "#4f4034");
  p.rect(cx - 1, cy + 9, cx + 1, cy + 9, "#f2c14e");
  p.outline("#2a3442");
  return { front: p };
}

// Beard width per row ([row, left, right]); the beard hangs over clothes and
// straps, so they're never drawn inside it.
const BEARD = {};
[
  [24, 26, 61], [25, 26, 61], [26, 27, 61], [27, 27, 60], [28, 27, 60], [29, 27, 59],
  [30, 27, 59], [31, 27, 59], [32, 28, 58], [33, 29, 57], [34, 29, 57], [35, 27, 56],
  [36, 27, 56], [37, 27, 55], [38, 27, 54], [39, 27, 53], [40, 28, 53], [41, 28, 52],
  [42, 28, 51], [43, 28, 50], [44, 28, 50], [45, 29, 53], [46, 30, 53], [47, 31, 52],
  [48, 32, 51], [49, 33, 50], [50, 34, 49], [51, 35, 48], [52, 36, 46], [53, 38, 44],
  [54, 38, 44],
].forEach(([y, l, r]) => (BEARD[y] = [l, r]));
const underBeard = (x, y) => BEARD[y] && x >= BEARD[y][0] && x <= BEARD[y][1];

const inPart = (part, x, y) => PART[part].has(`${x},${y}`);
const partRows = (part, y) => {
  const xs = [...PART[part]].map((k) => k.split(",").map(Number)).filter(([, py]) => py === y).map(([x]) => x);
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
};

// Dress body parts in cloth. The fur's shading bands become the cloth's
// shades, so sleeves keep the arm's crease and the torso its roundness.
// `to` is the last covered row per part (hem / cuff line).
function fit(p, to, pal) {
  for (const [part, last] of Object.entries(to)) {
    for (const k of PART[part]) {
      const [x, y] = k.split(",").map(Number);
      if (y > last) continue;
      const b = band(x, y);
      p.set(x, y, b === "o" ? pal.deep : b === "+" ? pal.dark : pal.base);
    }
  }
  // Light along the tops of the shoulders, just under the outline
  for (const pt of p.px.values())
    if (pt.y < 33 && band(pt.x, pt.y - 1) === "#" && pt.c === pal.base) pt.c = pal.light;
}

// A finished edge at the bottom of a part: a band of trim colour on the last
// rows, then an outline row on the fur just below, so the cloth reads as
// wrapping around the body instead of ending in a cut.
function trim(p, part, last, rows, colour) {
  for (let y = last - rows + 1; y <= last; y++) {
    const r = partRows(part, y);
    if (r) for (let x = r[0]; x <= r[1]; x++) if (inPart(part, x, y)) p.set(x, y, typeof colour === "function" ? colour(x, y) : colour);
  }
  const r = partRows(part, last);
  if (r) for (let x = r[0]; x <= r[1]; x++) if (" #".indexOf(band(x, last + 1)) < 0) p.set(x, last + 1, OUTLINE);
}

// Card icon for an outfit: the garment laid flat, with the part the beard
// covers on the character filled in and a neckline cut instead.
function flat(front, pal, neck) {
  const p = canvas();
  for (const pt of front.px.values()) p.set(pt.x, pt.y, pt.c);
  for (let y = 27; y <= 54; y++) {
    const xs = [...front.px.values()].filter((q) => q.y === y).map((q) => q.x);
    if (!xs.length) continue;
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
      if (p.has(x, y)) continue;
      const cut = neck(x, y);
      if (cut !== undefined) {
        if (cut) p.set(x, y, cut);
      } else p.set(x, y, underBeard(x, y) || band(x, y) !== "#" ? pal.base : pal.deep);
    }
  }
  p.outline();
  return p;
}

function jacket() {
  const p = canvas();
  const pal = { base: "#c99c5a", light: "#e2bd80", dark: "#a97d44", deep: "#8a6436" };
  const to = { torso: 60, leftArm: 56, rightArm: 58 };
  fit(p, to, pal);
  // Cuffs and hem
  trim(p, "leftArm", to.leftArm, 3, "#9b7340");
  trim(p, "rightArm", to.rightArm, 3, "#9b7340");
  trim(p, "torso", to.torso, 2, "#8a6436");
  [[54, "leftArm"], [56, "rightArm"]].forEach(([y, part]) => {
    const r = partRows(part, y);
    for (let x = r[0]; x <= r[1]; x++) if (inPart(part, x, y)) p.set(x, y, "#b38646");
  });
  // Zip from under the beard to the hem
  for (let y = 55; y <= 60; y++) {
    p.set(41, y, y % 2 ? "#f3e2b8" : "#cdb586");
    p.set(42, y, "#6e4f2a");
  }
  p.set(41, 61, "#f3e2b8");
  // Patch pockets with flaps
  const pocket = (x0, x1, y0) => {
    for (let y = y0; y <= y0 + 5; y++) for (let x = x0; x <= x1; x++) if (inPart("torso", x, y)) p.set(x, y, y === y0 + 5 ? "#8a6436" : "#b38646");
    for (let x = x0; x <= x1; x++) if (inPart("torso", x, y0)) p.set(x, y0, "#8a6436");
    for (let x = x0; x <= x1; x++) if (inPart("torso", x, y0 - 1)) p.set(x, y0 - 1, "#e2bd80");
    p.set(Math.round((x0 + x1) / 2), y0 + 1, "#f3e2b8");
  };
  pocket(24, 31, 52);
  pocket(47, 52, 51);
  // Shoulder epaulettes
  [[18, 22, 28], [62, 66, 29]].forEach(([x0, x1, y]) => {
    for (let x = x0; x <= x1; x++) {
      if (" #".indexOf(band(x, y)) < 0) p.set(x, y, "#8a6436");
      if (" #".indexOf(band(x, y + 1)) < 0) p.set(x, y + 1, "#b38646");
    }
  });
  const icon = flat(p, pal, (x, y) => {
    if (y > 46) return undefined;
    const hw = (46 - y) * 0.45 + 1;
    const d = Math.abs(x - 41.5);
    if (d <= hw - 2) return "#4a3520";
    if (d <= hw) return "#e8c98f";
    return undefined;
  });
  for (let y = 47; y <= 54; y++) p.has(41, y) || icon.set(41, y, y % 2 ? "#f3e2b8" : "#cdb586");
  return { front: p, icon };
}

function hoodie() {
  const p = canvas();
  const pal = { base: "#1f3354", light: "#33507c", dark: "#172741", deep: "#0f1a2c" };
  const to = { torso: 62, leftArm: 58, rightArm: 60 };
  fit(p, to, pal);
  const rib = (x) => (x % 2 ? "#14223a" : "#24395a");
  trim(p, "leftArm", to.leftArm, 3, rib);
  trim(p, "rightArm", to.rightArm, 3, rib);
  trim(p, "torso", to.torso, 2, rib);

  // Drawstrings hanging out from under the beard
  [36, 46].forEach((x, i) => {
    for (let y = 44; y <= 57 - i; y++) if (inPart("torso", x, y)) p.set(x, y, "#e6f1f7");
    p.set(x, 58 - i, "#38d6ee");
  });
  // Kangaroo pocket
  for (let y = 55; y <= 60; y++)
    for (let x = 29; x <= 54; x++) if (inPart("torso", x, y)) p.set(x, y, y === 55 ? "#38d6ee" : "#172741");
  for (let y = 56; y <= 60; y++) {
    p.set(29 + (60 - y), y, "#0f1a2c");
    p.set(54 - (60 - y), y, "#0f1a2c");
  }
  // Circuit traces running down the sleeves and sides
  const trace = (pts, part) =>
    pts.forEach(([x, y]) => inPart(part, x, y) && p.set(x, y, "#38d6ee"));
  const line = (x0, y0, x1, y1) => {
    const out = [];
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) out.push([x, y]);
    return out;
  };
  trace([...line(20, 34, 20, 44), ...line(18, 44, 20, 44), ...line(18, 44, 18, 53)], "leftArm");
  trace([...line(65, 33, 65, 42), ...line(65, 42, 67, 42), ...line(67, 42, 67, 55)], "rightArm");
  trace([...line(25, 44, 25, 50), ...line(25, 50, 29, 50)], "torso");
  trace([...line(52, 46, 52, 52)], "torso");
  [[20, 34], [18, 53], [65, 33], [67, 55], [29, 50], [52, 46]].forEach(([x, y]) => p.has(x, y) && p.set(x, y, "#9b86ff"));
  const icon = flat(p, pal, (x, y) => {
    const d = Math.hypot((x - 42.5) / 9, (y - 27) / 4);
    if (d <= 0.8) return "#0b1424";
    if (d <= 1.15) return "#2b4468";
    return undefined;
  });
  [38, 47].forEach((x) => {
    for (let y = 31; y <= 41; y++) icon.set(x, y, "#e6f1f7");
    icon.set(x, 42, "#38d6ee");
  });
  return { front: p, icon };
}

function backpack() {
  const back = canvas();
  const bag = "#232a3d";
  back.rect(17, 16, 70, 58, bag);
  back.shade({ light: "#36405a", dark: "#171c2a" });
  // Solana stripes on the bag
  back.rect(30, 26, 57, 28, "#14f195");
  back.rect(30, 33, 57, 35, "#7c6cf0");
  back.rect(30, 40, 57, 42, "#9945ff");
  back.rect(19, 18, 22, 20, "#36405a");
  back.outline();

  // Straps come over the shoulders along the arm seams, disappear under the
  // beard and come out again above the hip belt.
  const front = canvas();
  const strap = mixRows([[0, "#14f195"], [38, "#57b7e0"], [48, "#9945ff"]]);
  for (let y = 25; y <= 57; y++) {
    const l = partRows("leftArm", y);
    const r = partRows("rightArm", y);
    const spans = [];
    if (l) spans.push([l[1] - 1, l[1] + 3]);
    if (r) spans.push([r[0] - 3, r[0] + 1]);
    for (const [x0, x1] of spans)
      for (let x = x0; x <= x1; x++) {
        if (underBeard(x, y) || band(x, y) === " ") continue;
        front.set(x, y, x === x0 || x === x1 ? "#1d2433" : strap(x, y));
      }
  }
  // Hip belt + buckle
  for (let y = 56; y <= 58; y++)
    for (let x = 20; x <= 58; x++) if (inPart("torso", x, y)) front.set(x, y, y === 56 ? "#2d3548" : "#1d2433");
  front.rect(39, 55, 44, 59, "#c9d3df");
  front.rect(40, 56, 43, 58, "#7d8a99");
  front.set(39, 55, "#ffffff");
  front.outline();

  return { back, front };
}

function halo() {
  const p = canvas();
  for (let y = -15; y <= -5; y++) {
    for (let x = 30; x <= 58; x++) {
      const d = Math.hypot((x - 43.5) / 11.5, (y + 10) / 3.4);
      if (d >= 0.62 && d <= 1.02) p.set(x, y, y < -10 ? "#ffe597" : "#f2c14e");
    }
  }
  p.outline("#b8862b");
  const sparkle = (x, y) => {
    p.set(x, y, "#fff6c8");
    p.set(x - 1, y, "#f2c14e");
    p.set(x + 1, y, "#f2c14e");
    p.set(x, y - 1, "#f2c14e");
    p.set(x, y + 1, "#f2c14e");
  };
  sparkle(27, -6);
  sparkle(61, -8);
  sparkle(35, -17);
  sparkle(54, -18);
  return { front: p };
}


// Dhaka topi: Nepal's national cap. Snug on the crown, with the slanted top
// higher on the left. Palpali dhaka is woven in dense horizontal bands of small
// motifs (diamond chains, stepped triangles, dotted rules) in red, black and
// white picked out with orange, yellow and green.
function dhakaTopi() {
  const p = canvas();
  const left = 31;
  const right = 58;
  const top = (x) => -11 + Math.round(((x - left) / (right - left)) * 5); // -11 at left → -6 at right
  const C = {
    black: "#1a1214",
    maroon: "#7a1622",
    red: "#d42a35",
    orange: "#f08a2c",
    yellow: "#f6c945",
    white: "#f6f0e4",
    green: "#2f8f55",
  };
  const mod = (n, m) => ((n % m) + m) % m;

  // Large diamonds, each in its own colour with a bright eye and a red heart,
  // linked by white dots.
  const bigDiamonds = (x, row) => {
    const xm = mod(x, 8);
    const m = mod(Math.floor(x / 8), 3);
    const d = Math.abs(xm - 4) + Math.abs(row - 2);
    if (d === 0) return [C.yellow, C.white, C.yellow][m];
    if (d === 1) return C.red;
    if (d === 2) return [C.white, C.orange, C.green][m];
    if (xm === 0 && row === 2) return C.white;
    return C.black;
  };
  // A chain of small diamonds.
  const smallDiamonds = (x, row) => {
    const xm = mod(x + 2, 4);
    if (row === 1) return xm === 2 ? C.yellow : xm === 0 ? C.black : C.red;
    return xm === 2 ? C.red : C.black;
  };
  // Stepped triangles on a maroon ground.
  const triangles = (x, row) => {
    const d = Math.abs(mod(x, 6) - 3);
    if (d === row) return C.green;
    if (d < row) return C.orange;
    return C.maroon;
  };
  const dotted = (x, a, b) => (mod(x, 2) ? a : b);

  const bands = {
    2: (x) => dotted(x, C.white, C.black),
    1: (x) => bigDiamonds(x, 4),
    0: (x) => bigDiamonds(x, 3),
    "-1": (x) => bigDiamonds(x, 2),
    "-2": (x) => bigDiamonds(x, 1),
    "-3": (x) => bigDiamonds(x, 0),
    "-4": (x) => (mod(x, 4) === 1 ? C.white : C.red),
    "-5": (x) => triangles(x, 0),
    "-6": (x) => triangles(x, 1),
    "-7": (x) => triangles(x, 2),
    "-8": (x) => dotted(x, C.black, C.white),
    "-9": (x) => smallDiamonds(x, 0),
    "-10": (x) => smallDiamonds(x, 1),
    "-11": (x) => smallDiamonds(x, 2),
  };

  for (let x = left; x <= right; x++) {
    const corner = x === left || x === right ? 1 : 0;
    for (let y = top(x) + corner; y <= 3; y++) p.set(x, y, bands[y]?.(x) ?? C.black);
    // The folded top edge catches the light
    p.set(x, top(x) + corner, "#5a3a3e");
  }
  p.span(3, left, right, "#120d0f");
  // Pleat where the crown folds in at the front
  for (let y = top(46) + 1; y <= 2; y++) p.set(46, y, "#0c0809");

  p.outline();
  return { front: p };
}

// Daura suruwal with an istakot: the long cross-tied tunic in ivory down to
// the knees, a charcoal waistcoat over it with brass buttons, and suruwal
// trousers that bunch and narrow at the ankle.
function dauraSuruwal() {
  const p = canvas();
  const pal = { base: "#ece2cb", light: "#f8f2e3", dark: "#d3c5a6", deep: "#b5a582" };
  fit(p, { torso: 70, leftArm: 61, rightArm: 63 }, pal);
  trim(p, "leftArm", 61, 2, "#d3c5a6");
  trim(p, "rightArm", 63, 2, "#d3c5a6");

  // Istakot over the torso, ending in a straight hem
  const vest = { base: "#3b4150", dark: "#2c313d", deep: "#20242d" };
  const vestHem = 66;
  for (const k of PART.torso) {
    const [x, y] = k.split(",").map(Number);
    if (y > vestHem) continue;
    const b = band(x, y);
    p.set(x, y, b === "o" ? vest.deep : b === "+" ? vest.dark : vest.base);
  }
  for (const pt of p.px.values())
    if (pt.c === vest.base && pt.y < 33 && band(pt.x, pt.y - 1) === "#") pt.c = "#4d5466";
  for (let x = 0; x < 96; x++) if (inPart("torso", x, vestHem)) p.set(x, vestHem, vest.deep);
  // Front opening and brass buttons below the beard
  for (let y = 54; y <= vestHem; y++) p.set(42, y, vest.deep);
  [56, 59, 62, 65].forEach((y) => p.set(41, y, "#f2c14e"));
  // Pockets
  [[30, 35], [47, 52]].forEach(([x0, x1]) => {
    for (let x = x0; x <= x1; x++) if (inPart("torso", x, 60)) p.set(x, 60, "#5a6274");
  });

  // Daura skirt below the vest, over the thighs, with the cross-over edge
  // running down to the hem and a pair of ties at the waist.
  const daura = (x, y) => {
    const b = band(x, y);
    p.set(x, y, b === "o" ? pal.deep : b === "+" ? pal.dark : pal.base);
  };
  const skirtHem = 80;
  for (let y = vestHem + 1; y <= skirtHem; y++)
    for (let x = 26; x <= 66; x++) {
      const b = band(x, y);
      const inside = b !== " " && (b !== "#" || (x > 26 && x < 66 && Math.abs(x - 45) <= 1));
      if (inside || (y > 70 && x >= 44 && x <= 46)) daura(x, y);
    }
  for (let y = vestHem + 1; y <= skirtHem; y++) p.set(36 + Math.floor((y - vestHem) / 3), y, pal.deep);
  [[47, 68], [48, 69], [49, 70], [49, 68], [47, 70]].forEach(([x, y]) => p.set(x, y, "#b8323a"));
  p.set(48, 69, "#8a1f27");
  p.span(skirtHem, 27, 65, pal.dark);
  for (let x = 27; x <= 65; x++) p.set(x, skirtHem + 1, OUTLINE);

  // Suruwal: loose over the knees, gathered tight above the feet
  for (let y = skirtHem + 2; y <= 83; y++)
    for (let x = 27; x <= 65; x++) {
      const b = band(x, y);
      if (b === " " || b === "#") continue;
      const fold = y > 80 && (x + y) % 3 === 0;
      p.set(x, y, fold ? pal.dark : b === "+" || b === "o" ? pal.dark : "#e2d6bb");
    }
  for (const [x0, x1] of [[27, 43], [47, 65]]) {
    for (let x = x0; x <= x1; x++) if (" #".indexOf(band(x, 83)) < 0) p.set(x, 83, pal.deep);
  }
  return { front: p, icon: dauraFlat(pal, vest) };
}

// Card icon: the whole set on an invisible wearer. Stand collar, the daura's
// cross-over front and red ties showing in the istakot's V, long sleeves, the
// knee-length skirt with side slits, and suruwal tapering to tight cuffs.
function dauraFlat(pal, vest) {
  const p = canvas();
  const cx = 44;
  // Fill a row span with cloth: light on the left edge, shade on the right.
  const cloth = (y, x0, x1, c) => {
    for (let x = x0; x <= x1; x++) p.set(x, y, x === x0 ? c.light ?? c.base : x === x1 ? c.dark : c.base);
  };
  const ivory = { base: pal.base, light: pal.light, dark: pal.dark };
  const charcoal = { base: vest.base, light: "#4d5466", dark: vest.dark };

  // Sleeves, hanging a little away from the body, with cuffs
  for (let y = 26; y <= 50; y++) {
    const out = Math.floor((y - 26) / 6);
    cloth(y, cx - 22 - out, cx - 15 - Math.floor(out / 2), ivory);
    cloth(y, cx + 15 + Math.floor(out / 2), cx + 22 + out, ivory);
  }
  for (const y of [49, 50]) {
    const out = Math.floor((y - 26) / 6);
    p.span(y, cx - 22 - out, cx - 15 - Math.floor(out / 2), pal.deep);
    p.span(y, cx + 15 + Math.floor(out / 2), cx + 22 + out, pal.deep);
  }
  // Shoulders and body down to the knees, flaring slightly
  for (let y = 22; y <= 70; y++) {
    const hw = y < 26 ? 6 + (y - 22) * 3 : y < 54 ? 15 : 15 + Math.floor((y - 54) / 5);
    cloth(y, cx - hw, cx + hw - 1, ivory);
  }
  // Stand collar
  p.rect(cx - 4, 19, cx + 3, 21, pal.base);
  p.span(19, cx - 4, cx + 3, pal.light);
  p.span(21, cx - 4, cx + 3, pal.dark);
  // Side slits at the hem
  for (let y = 65; y <= 70; y++) {
    const hw = 15 + Math.floor((y - 54) / 5);
    p.set(cx - hw + 2, y, pal.deep);
    p.set(cx + hw - 3, y, pal.deep);
  }
  // Daura's cross-over edge running down to the hem
  for (let y = 22; y <= 70; y++) {
    const x = y < 38 ? cx - 4 + Math.floor((y - 22) / 2) : cx + 4;
    p.set(x, y, pal.deep);
  }
  p.span(70, cx - 18, cx + 17, pal.deep);

  // Istakot: sleeveless, V-neck, straight hem, brass buttons and welt pockets
  for (let y = 22; y <= 50; y++) {
    const hw = y < 26 ? 4 + (y - 22) * 3 : 14;
    const v = Math.max(0, Math.round((36 - y) / 2.2));
    if (cx - hw <= cx - v - 1) cloth(y, cx - hw, cx - v - 1, charcoal);
    if (cx + v <= cx + hw - 1) cloth(y, cx + v, cx + hw - 1, charcoal);
  }
  p.span(50, cx - 14, cx + 13, vest.deep);
  for (let y = 37; y <= 50; y++) p.set(cx, y, vest.deep);
  [39, 42, 45, 48].forEach((y) => p.set(cx - 1, y, "#f2c14e"));
  p.span(44, cx - 11, cx - 6, "#5a6274");
  p.span(44, cx + 5, cx + 10, "#5a6274");
  // Red cross-ties showing in the V
  [[cx - 2, 28], [cx - 1, 29], [cx - 3, 29], [cx, 33], [cx + 1, 34], [cx - 1, 34]].forEach(([x, y]) => p.set(x, y, "#b8323a"));

  // Suruwal: roomy at the top, gathered into tight cuffs
  for (let y = 71; y <= 92; y++) {
    const t = (y - 71) / 21;
    const w = Math.round(12 - t * 6);
    const gap = 1;
    const inner = gap + Math.round(t * 2);
    cloth(y, cx - inner - w, cx - inner - 1, ivory);
    cloth(y, cx + inner, cx + inner + w - 1, ivory);
    if (y >= 84 && y <= 90 && y % 2 === 0) {
      for (let x = cx - inner - w + 1; x <= cx - inner - 2; x += 2) p.set(x, y, pal.dark);
      for (let x = cx + inner + 1; x <= cx + inner + w - 2; x += 2) p.set(x, y, pal.dark);
    }
  }
  for (const y of [91, 92]) {
    p.span(y, cx - 3 - 6, cx - 4, pal.deep);
    p.span(y, cx + 3, cx + 3 + 5, pal.deep);
  }
  p.outline();
  return p;
}

// ---------------------------------------------------------------------------
// Pack gear: wardrobes for the pack characters (Pirate, Tribal, Rogues).
//
// Pack characters are 48×48 sprites (sprites.js) scaled ×2 onto the 96×96
// grid, so their gear is drawn on that same 48×48 grid, in the same pixels,
// then scaled up. Each piece is drawn once per character it fits, from that
// character's anchors (sprites.js); the first character's drawing is the
// default visual and the others go in visual.perCharacter.
// ---------------------------------------------------------------------------

// Drawn in the characters' 48-unit coordinates at k = 4, like the characters
// themselves: 192 pixels across, i.e. res 2 on the 96×96 grid.
//
// Held things (cutlass, spear, pouch) are drawn in the `back` layer, behind
// the character, so the character's own fist closes over the handle.
const K = 4;
const RES = K / 2;
const gcanvas = () => canvas(K);
const gpart = (shape) => part(shape, K);

const mid = (a) => Math.floor((a.head.x0 + a.head.x1) / 2);
const GOLD_TRIM = { b: "#f2c14e", l: "#ffe08a", d: "#c48d2c" };

// Pirate: black tricorn, worn low on the head: a rounded crown, a brim
// whose wings turn up at the sides, gold trim and a skull on the front.
function tricorn(a) {
  const p = gcanvas();
  const felt = { b: "#2b2b38", l: "#474759", d: "#1a1a24" };
  const { x0, x1, y0 } = a.head;
  const c = mid(a);
  layer(p, gpart((q) => roundRect(q, x0 + 6, y0 - 5, x1 - 6, y0 + 5, 4, felt.b)), felt);
  const brim = gpart((q) => {
    const centre = (x0 + x1) / 2;
    const flat = (x1 - x0) / 2 - 4;
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      const wing = Math.max(0, Math.abs(x - centre) - flat);
      for (let y = y0 + 4 - Math.round(wing * 0.8); y <= y0 + 7; y++) q.set(x, y, felt.b);
    }
  });
  layer(p, brim, felt);
  for (const pt of brim.px.values())
    if (!brim.hasPx(pt.x, pt.y - 1) || !brim.hasPx(pt.x, pt.y - 2)) p.setPx(pt.x, pt.y, GOLD_TRIM.b);
  stamp(p, c - 2, y0 - 2, [".www.", "wkwkw", "wwwww", ".w.w."], { w: "#f2efe6", k: felt.b });
  return p;
}

// Pirate: a small leather eyepatch over the left eye, held by a thin strap
// that runs flat across the brow to both sides of the head. The strap has no
// outline of its own, so it reads as a line, not a band across the face.
function eyepatch(a) {
  const p = gcanvas();
  const e = a.eyes;
  const cx = Math.floor((e.l[0] + e.l[1]) / 2);
  const cy = Math.floor((e.y0 + e.y1) / 2);
  const r = Math.max(2, Math.ceil((e.l[1] - e.l[0]) / 2));
  const strapY = e.y0 - 2;
  line(p, cx + r, cy - 1, a.head.x1 - 1, strapY - 2, "#3a2418");
  line(p, cx - r, cy - 1, a.head.x0 + 1, strapY - 2, "#3a2418");
  layer(p, gpart((q) => roundRect(q, cx - r, cy - r, cx + r + 1, cy + r + 1, 2, "#2a1d20")), {
    b: "#2a1d20",
    l: "#4a3438",
    d: "#1a1012",
  });
  p.set(cx - r + 1, cy - r + 1, "#6a5458");
  return p;
}

// The eyepatch on its own, for its card: the patch on a loop of strap.
function eyepatchIcon() {
  const p = gcanvas();
  const leather = { b: "#5a3a2a", l: "#7a5240", d: "#3a2418" };
  const strap = gpart((q) => {
    ellipse(q, 12, 8, 11, 5, leather.b);
    erase(q, (x, y) => ((x - 12) / 10) ** 2 + ((y - 8) / 4) ** 2 < 1);
  });
  layer(p, strap, null);
  layer(p, gpart((q) => roundRect(q, 3, 6, 10, 13, 3, "#2a1d20")), { b: "#2a1d20", l: "#4a3438", d: "#1a1012" });
  p.set(5, 8, "#6a5458");
  return p;
}

// Pirate: a cutlass held in the right fist (drawn behind the character, so
// the fist closes over the grip): blade up and slightly out, gold guard just
// above the knuckles, pommel showing below.
function cutlass(a) {
  const back = gcanvas();
  const [hx, hy] = a.handR;
  const top = a.handR[1] - 3; // top of the fist
  const blade = gpart((q) =>
    polygon(q, [[hx - 0.2, top - 1], [hx + 1.6, top - 1], [hx + 5.5, top - 15], [hx + 6.2, top - 20], [hx + 3.6, top - 14]], "#dfe6ec"),
  );
  layer(back, blade, { b: "#dfe6ec", l: "#ffffff", d: "#9aa6b2" });
  layer(back, gpart((q) => roundRect(q, hx - 2, top - 2, hx + 3, top - 1, 0.6, GOLD_TRIM.b)), GOLD_TRIM);
  layer(back, gpart((q) => q.rect(hx, top, hx + 1, hy + 4, "#6b3e26")), { b: "#6b3e26", l: "#8a5634", d: "#4a2a18" });
  layer(back, gpart((q) => ellipse(q, hx + 0.5, hy + 5, 1.4, 1.2, GOLD_TRIM.b)), GOLD_TRIM);
  return { back, front: gcanvas() };
}

// Pirate: a green parrot with a red crown, standing on the left shoulder and
// facing in towards the head, its tail hanging behind the arm. `perch` is
// where its feet grip (the top of the shoulder).
function parrot(a) {
  const p = gcanvas();
  const [fx, fy] = a.perch;
  const green = { b: "#3faa4a", l: "#74d06e", d: "#24783a" };
  layer(p, gpart((q) => polygon(q, [[fx - 3, fy - 2], [fx - 1, fy - 2], [fx - 3.5, fy + 5], [fx - 5.5, fy + 5]], "#2f7fd1")), {
    b: "#2f7fd1",
    l: "#5aa0e8",
    d: "#1f5fa8",
  });
  layer(p, gpart((q) => {
    ellipse(q, fx - 2.2, fy - 4.5, 3, 4.2, green.b);
    ellipse(q, fx - 1.2, fy - 9.3, 2.6, 2.5, green.b);
  }), green);
  layer(p, gpart((q) => ellipse(q, fx - 3, fy - 4, 1.7, 2.8, (x, y) => (y > fy - 4 ? "#2f7fd1" : "#f2c14e"))));
  ellipse(p, fx - 1.4, fy - 11.4, 1.6, 0.9, "#d63a3a");
  ellipse(p, fx - 0.2, fy - 9.4, 1.1, 1, "#f2efe6");
  ellipse(p, fx - 0.1, fy - 9.5, 0.45, 0.5, "#1b2430");
  layer(p, gpart((q) => polygon(q, [[fx + 1, fy - 10.5], [fx + 3, fy - 9.6], [fx + 2.4, fy - 7.6], [fx + 1.3, fy - 8.6]], "#3b3b42")));
  layer(p, gpart((q) => {
    q.rect(fx - 3, fy - 1, fx - 2, fy - 1, "#e0a43a");
    q.rect(fx - 1, fy - 1, fx, fy - 1, "#e0a43a");
  }));
  return p;
}

// Tribal: five tall feathers fanned on a woven band.
function featherHeaddress(a) {
  const p = gcanvas();
  const { x0, x1, y0 } = a.head;
  const c = mid(a);
  [[-10, 8, "#d63a3a"], [-5, 11, "#f08a2c"], [0, 14, "#2fb67a"], [5, 11, "#f08a2c"], [10, 8, "#d63a3a"]].forEach(([dx, h, col]) => {
    const cx = c + dx;
    const top = y0 + 4 - h;
    const f = gpart((q) => {
      for (let y = top; y <= y0 + 4; y++) {
        const w = y === top ? 0 : 1;
        const lean = Math.round((dx / 10) * ((y0 + 4 - y) / h) * 2);
        for (let k = -w; k <= w; k++) q.set(cx + lean + k, y, y - top < 3 ? "#1b2430" : col);
      }
    });
    layer(p, f);
  });
  const band = gpart((q) => q.rect(x0 + 1, y0 + 5, x1 - 1, y0 + 8, "#8a4a25"));
  layer(p, band);
  for (let x = x0 + 1; x <= x1 - 1; x++) p.set(x, y0 + 6 + Math.abs((x % 4) - 2) - 1, "#f6c945");
  return p;
}

// Tribal: a carved wooden tiki mask over the face.
function tikiMask(a) {
  const p = gcanvas();
  const wood = { b: "#9a6234", l: "#b97c47", d: "#74461f" };
  const { x0, x1 } = a.head;
  const e = a.eyes;
  const top = e.y0 - 4;
  const bottom = e.y1 + 9;
  layer(p, gpart((q) => roundRect(q, x0 + 3, top, x1 - 3, bottom, 3, wood.b)), wood, "#3a2210");
  p.span(top + 2, x0 + 5, x1 - 5, wood.d);
  for (const [lx0, lx1] of [e.l, e.r]) {
    p.rect(lx0 - 1, e.y0, lx1 + 1, e.y1 + 1, "#1b1210");
    p.set(lx0, e.y0 + 1, "#f6c945");
  }
  const c = mid(a);
  p.rect(c - 1, e.y1 + 1, c + 2, e.y1 + 4, wood.d);
  p.rect(x0 + 7, bottom - 3, x1 - 7, bottom - 1, "#1b1210");
  for (let x = x0 + 8; x <= x1 - 8; x += 2) p.set(x, bottom - 2, "#f6f0e4");
  [x0 + 4, x1 - 5].forEach((x) => {
    p.rect(x, e.y1 + 2, x + 1, e.y1 + 2, "#d63a3a");
    p.rect(x, e.y1 + 4, x + 1, e.y1 + 4, "#d63a3a");
  });
  return p;
}

// Tribal: bone and red beads on a cord, with a big tooth in the middle.
function boneNecklace(a) {
  const p = gcanvas();
  const { x0, x1 } = a.head;
  const c = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 - 6;
  const sag = (x) => a.chest + Math.round(3 * (1 - ((x - c) / half) ** 2));
  for (let x = Math.ceil(c - half); x <= Math.floor(c + half); x++) p.set(x, sag(x), "#5a3418");
  let n = 0;
  for (let x = Math.ceil(c - half) + 1; x <= c + half - 1; x += 3, n++) {
    const bead = gpart((q) => q.rect(x, sag(x) - 1, x + 1, sag(x), n % 2 ? "#c0392b" : "#f6f0e4"));
    layer(p, bead, null, "#3a2210");
  }
  const tooth = gpart((q) => polygon(q, [[c - 2, sag(c) + 1], [c + 2, sag(c) + 1], [c, sag(c) + 6]], "#f6f0e4"));
  layer(p, tooth, null, "#3a2210");
  return p;
}

// Tribal: a stone-tipped spear held upright in the right fist (drawn behind
// the character, so the fist closes round the shaft).
function tribalSpear(a) {
  const back = gcanvas();
  const [hx, hy] = a.handR;
  const x = hx;
  layer(back, gpart((q) => q.rect(x, hy - 30, x + 1, 46, "#7a5230")), { b: "#7a5230", l: "#9a6a40", d: "#5a3a20" });
  layer(back, gpart((q) => polygon(q, [[x + 0.5, hy - 40], [x + 3.2, hy - 33.5], [x + 0.5, hy - 29.5], [x - 2.2, hy - 33.5]], "#9aa6b2")), {
    b: "#9aa6b2",
    l: "#d6dee6",
    d: "#6a7682",
  });
  layer(back, gpart((q) => q.rect(x - 1, hy - 30, x + 2, hy - 29, "#f6c945")));
  layer(back, gpart((q) => polygon(q, [[x - 1, hy - 28], [x - 3, hy - 21], [x - 1.5, hy - 22]], "#d63a3a")));
  layer(back, gpart((q) => polygon(q, [[x + 2, hy - 28], [x + 4, hy - 22], [x + 2.5, hy - 23]], "#2fb67a")));
  for (const y of [hy - 5, hy + 6]) layer(back, gpart((q) => q.rect(x, y, x + 1, y, "#f08a2c")));
  return { back, front: gcanvas() };
}

// Rogues: a deep hood framing the face and draping onto the shoulders.
function rogueHood(a) {
  const p = gcanvas();
  const cloth = { b: "#454857", l: "#5f6375", d: "#30323d" };
  const { x0, x1, y0 } = a.head;
  const e = a.eyes;
  const hood = gpart((q) => {
    roundRect(q, x0 - 2, y0 - 3, x1 + 2, e.y1 + 8, 10, cloth.b);
    roundRect(q, x0 - 1, 24, x1 + 1, 29, 3, cloth.b);
    polygon(q, [[mid(a) - 3, y0 - 2], [mid(a) + 4, y0 - 2], [mid(a) + 2, y0 - 7]], cloth.b);
  });
  erase(hood, (x, y) => ((x - (x0 + x1) / 2) / ((x1 - x0) / 2 - 3)) ** 2 + ((y - (e.y1 + 4)) / (e.y1 - y0)) ** 2 <= 1 && y >= y0 + 4);
  layer(p, hood, cloth);
  // Folds down each side
  line(p, x0 - 1, y0 + 8, x0 - 1, 27, cloth.d);
  line(p, x1 + 1, y0 + 8, x1 + 1, 27, cloth.d);
  return p;
}

// Rogues: a domino mask, a lens round each eye joined over the nose, eye
// holes open so the eyes show through.
function dominoMask(a) {
  const p = gcanvas();
  const e = a.eyes;
  const silk = { b: "#6b3fa0", l: "#8f63c4", d: "#4a2a75" };
  // Small eyes get roomier holes so a ring of skin shows round them
  const g = e.l[1] - e.l[0] < 4 ? 1 : 0;
  const mask = gpart((q) => {
    for (const [lx0, lx1] of [e.l, e.r]) roundRect(q, lx0 - g - 2, e.y0 - g - 2, lx1 + g + 2, e.y1 + g + 2, 2, silk.b);
    q.rect(e.l[1] + g + 2, e.y0 - 1, e.r[0] - g - 2, e.y0 + 1, silk.b);
    line(q, e.l[0] - g - 3, e.y0, a.head.x0 + 1, e.y0 - 1, silk.b);
    line(q, e.r[1] + g + 3, e.y0, a.head.x1 - 1, e.y0 - 1, silk.b);
  });
  erase(mask, (x, y) => [e.l, e.r].some(([lx0, lx1]) => x >= lx0 - g && x <= lx1 + g && y >= e.y0 - g && y <= e.y1 + g));
  layer(p, mask, silk);
  return p;
}

// Rogues: a fat coin pouch on a gold cord, hanging from the left fist (the
// cord runs behind the fist, so it's held).
function coinPouch(a) {
  const back = gcanvas();
  const [hx, hy] = a.handL;
  const leather = { b: "#8a5a2e", l: "#a87443", d: "#64401f" };
  const cx = hx - 1;
  const cy = hy + 7;
  layer(back, gpart((q) => line(q, hx, hy - 1, cx, cy - 4, "#c9a24a")), null);
  layer(back, gpart((q) => {
    ellipse(q, cx, cy, 3.6, 3.1, leather.b);
    roundRect(q, cx - 1, cy - 4, cx + 1, cy - 2, 0.8, leather.b);
  }), leather);
  back.span(cy - 2, cx - 1, cx + 1, "#c9a24a");
  ellipse(back, cx + 0.2, cy + 0.4, 1.1, 1.1, GOLD_TRIM.b);
  return { back, front: gcanvas() };
}

// Which characters each piece is drawn for (first = default drawing), and
// optionally a separate drawing for its card.
const PIRATES = ["captain", "squidman", "zombie-pirate"];
const TRIBAL = ["warrior", "shaman"];
const ROGUES = ["bandit", "goblin"];

const GEAR = {
  tricorn: [tricorn, PIRATES],
  eyepatch: [eyepatch, PIRATES, eyepatchIcon],
  cutlass: [cutlass, PIRATES],
  parrot: [parrot, PIRATES],
  "feather-headdress": [featherHeaddress, TRIBAL],
  "tiki-mask": [tikiMask, TRIBAL],
  "bone-necklace": [boneNecklace, TRIBAL],
  "tribal-spear": [tribalSpear, TRIBAL],
  "rogue-hood": [rogueHood, ROGUES],
  "domino-mask": [dominoMask, ROGUES],
  "coin-pouch": [coinPouch, ROGUES],
};

// ---------------------------------------------------------------------------

const DRAW = {
  "blue-beanie": beanie,
  "glacier-crown": crown,
  "signal-headphones": headphones,
  "dev-visor": visor,
  "pixel-glasses": glasses,
  "frost-scarf": scarf,
  "snow-globe": snowGlobe,
  "explorer-jacket": jacket,
  "circuit-hoodie": hoodie,
  "solana-backpack": backpack,
  "genesis-halo": halo,
  "dhaka-topi": dhakaTopi,
  "daura-suruwal": dauraSuruwal,
};

// Stacking order on the character, back to front.
export const SLOT_ORDER = ["outfit", "backpack", "accessory", "headwear", "hat", "held", "special"];

function bounds(runs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of runs) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w - 1);
    y1 = Math.max(y1, r.y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// { [wearableId]: { back: runs|null, front: runs, icon: runs|null, bounds,
//   perCharacter?: { [characterId]: { front, bounds } } } }
export const wearableArt = Object.fromEntries([
  ...Object.entries(DRAW).map(([id, draw]) => {
    const { back, front, icon } = draw();
    const backRuns = back ? back.runs() : null;
    const frontRuns = front.runs();
    const iconRuns = icon ? icon.runs() : null;
    return [
      id,
      {
        back: backRuns,
        front: frontRuns,
        icon: iconRuns,
        bounds: bounds(iconRuns ?? [...(backRuns ?? []), ...frontRuns]),
      },
    ];
  }),
  ...Object.entries(GEAR).map(([id, [draw, fits, drawIcon]]) => {
    // A drawing is a canvas (front only) or { back, front }.
    const layers = (out) => {
      const back = out.back?.runs() ?? [];
      const front = (out.front ?? out).runs();
      return { back: back.length ? back : null, front, bounds: bounds([...back, ...front]) };
    };
    const [first, ...rest] = fits.map((c) => layers(draw(anchors[c])));
    const icon = drawIcon ? drawIcon().runs() : null;
    return [
      id,
      {
        back: first.back,
        front: first.front,
        icon,
        res: RES,
        bounds: icon ? bounds(icon) : first.bounds,
        perCharacter: Object.fromEntries(rest.map((l, i) => [fits[i + 1], l])),
      },
    ];
  }),
]);

// Characters each pack piece is drawn for.
export const gearFits = Object.fromEntries(Object.entries(GEAR).map(([id, [, fits]]) => [id, fits]));
