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
// Plain data + functions, no imports. Source art only: build-seed.mjs stores
// the generated layers in the database (wearables.visual), and nft/make-art.mjs
// renders the NFT PNGs from it. The site draws from the database, not this file.

const OUTLINE = "#0b0f17";

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

// ---------------------------------------------------------------------------
// Tiny pixel canvas
// ---------------------------------------------------------------------------

function canvas() {
  const px = new Map();
  const key = (x, y) => `${x},${y}`;

  const api = {
    px,
    set(x, y, c) {
      px.set(key(x, y), { x, y, c });
    },
    get(x, y) {
      return px.get(key(x, y))?.c;
    },
    has(x, y) {
      return px.has(key(x, y));
    },
    span(y, x0, x1, c) {
      for (let x = x0; x <= x1; x++) api.set(x, y, typeof c === "function" ? c(x, y) : c);
    },
    rect(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) api.span(y, x0, x1, c);
    },
    // Recolour filled pixels on the top / bottom edge of the current shape.
    shade({ light, dark }, only) {
      const next = [];
      for (const p of px.values()) {
        if (only && !only.includes(p.c)) continue;
        if (!api.has(p.x, p.y - 1)) next.push([p.x, p.y, light]);
        else if (!api.has(p.x, p.y + 1) || !api.has(p.x + 1, p.y)) next.push([p.x, p.y, dark]);
      }
      next.forEach(([x, y, c]) => c && api.set(x, y, c));
    },
    // 1px outline around everything drawn so far.
    outline(c = OUTLINE) {
      const ring = new Set();
      for (const p of px.values()) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = key(p.x + dx, p.y + dy);
          if (!px.has(k)) ring.add(k);
        }
      }
      ring.forEach((k) => {
        const [x, y] = k.split(",").map(Number);
        api.set(x, y, c);
      });
    },
    // Merge horizontal runs of one colour → [{ x, y, w, c }].
    runs() {
      const rows = new Map();
      for (const p of px.values()) {
        if (!rows.has(p.y)) rows.set(p.y, []);
        rows.get(p.y).push(p);
      }
      const out = [];
      for (const [y, row] of rows) {
        row.sort((a, b) => a.x - b.x);
        let start = row[0];
        let w = 1;
        for (let i = 1; i <= row.length; i++) {
          const p = row[i];
          if (p && p.x === start.x + w && p.c === start.c) {
            w++;
          } else {
            out.push({ x: start.x, y, w, c: start.c });
            start = p;
            w = 1;
          }
        }
      }
      return out;
    },
  };

  return api;
}

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
  return { front: p };
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
// Pack wearables: Pirate, Tribal and Rogues gear for the dressable
// characters, drawn on the same grid.
// ---------------------------------------------------------------------------

const paint = (c, x, y) => (typeof c === "function" ? c(x, y) : c);

// Straight 1px line (Bresenham).
function line(p, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    p.set(x0, y0, paint(c, x0, y0));
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function ellipse(p, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) p.set(x, y, paint(c, x, y));
}

// Remove every drawn pixel matching `test(x, y)`.
function erase(p, test) {
  for (const pt of [...p.px.values()]) if (test(pt.x, pt.y)) p.px.delete(`${pt.x},${pt.y}`);
}

// Pirate: black felt tricorn, both wings turned up, gold-trimmed, with a
// skull on the front.
function tricorn() {
  const p = canvas();
  const felt = "#2b2b38";
  [[-10, 7], [-9, 9], [-8, 10], [-7, 11]].forEach(([y, hw]) => p.span(y, 44 - hw, 43 + hw, felt));
  for (let y = -6; y <= 0; y++) p.span(y, 32, 55, felt);
  const wingTop = (x) => -Math.round(Math.max(0, Math.abs(x - 43.5) - 11) * 0.5);
  for (let x = 21; x <= 66; x++) for (let y = wingTop(x); y <= 4; y++) p.set(x, y, felt);
  p.shade({ light: "#474759", dark: "#1a1a24" });
  // Gold trim along the brim and up the wings
  for (let x = 21; x <= 66; x++) {
    p.set(x, 3, "#f2c14e");
    if (wingTop(x) < 0) p.set(x, wingTop(x), "#f2c14e");
  }
  p.span(4, 21, 66, "#c48d2c");
  // Skull and crossbones
  const skull = ["..www..", ".wwwww.", ".wkwkw.", ".wwwww.", "..w.w..", "w.....w", ".w...w."];
  skull.forEach((row, i) =>
    [...row].forEach((ch, j) => ch !== "." && p.set(40 + j, -8 + i, ch === "w" ? "#f2efe6" : "#1a1a24")),
  );
  p.outline();
  return { front: p };
}

// Pirate: leather eyepatch over one eye, strap across the brow.
function eyepatch() {
  const p = canvas();
  const strap = "#1c1418";
  line(p, 25, 10, 32, 12, strap);
  line(p, 41, 11, 61, 7, strap);
  ellipse(p, 36.5, 13, 5, 4, "#2a1d20");
  p.span(10, 34, 38, "#4a3438");
  p.set(34, 11, "#5e4448");
  p.outline();
  return { front: p };
}

// Pirate: a curved cutlass gripped in the right hand, blade up and out.
function cutlass() {
  const p = canvas();
  // Blade: from the guard curving out to the tip
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(68 + 20 * t + 5 * Math.sin(Math.PI * t));
    const y = Math.round(60 - 33 * t);
    const w = t > 0.92 ? 0 : t > 0.78 ? 1 : 2;
    for (let k = 0; k <= w; k++) p.set(x + k, y, k === 0 ? "#f4f8fb" : k === w ? "#8a96a3" : "#c9d3dc");
  }
  // Guard, knuckle bow, grip and pommel
  p.span(61, 63, 74, "#f2c14e");
  p.span(62, 64, 73, "#c48d2c");
  p.rect(67, 63, 69, 71, "#6b3e26");
  p.set(68, 65, "#8a5634");
  p.set(68, 68, "#8a5634");
  p.rect(66, 72, 70, 73, "#f2c14e");
  p.outline();
  return { front: p };
}

// Pirate: a parrot perched on the left shoulder.
function parrot() {
  const p = canvas();
  const red = "#d63a3a";
  ellipse(p, 18, 20, 5, 6, red);
  ellipse(p, 19, 12, 4, 4, red);
  p.shade({ light: "#f06a5a", dark: "#a82a2a" });
  // Wing and tail
  ellipse(p, 16, 21, 3, 5, (x, y) => (y > 22 ? "#2f7fd1" : "#f2c14e"));
  p.rect(14, 26, 16, 31, "#2f7fd1");
  p.rect(14, 32, 16, 33, "#2fb67a");
  // Face: white patch, eye, hooked beak
  p.rect(20, 10, 22, 13, "#f2efe6");
  p.set(21, 11, "#1b2430");
  p.rect(23, 11, 25, 12, "#3b3b42");
  p.rect(23, 13, 24, 14, "#3b3b42");
  p.set(25, 13, "#3b3b42");
  // Feet gripping the shoulder
  p.span(26, 18, 22, "#e0a43a");
  p.outline();
  const shifted = canvas();
  for (const pt of p.px.values()) shifted.set(pt.x, pt.y + 3, pt.c);
  return { front: shifted };
}

// Tribal: a crown of tall feathers on a woven band.
function featherHeaddress() {
  const p = canvas();
  const colours = ["#d63a3a", "#f08a2c", "#f6c945", "#2fb67a", "#f6c945", "#f08a2c", "#d63a3a"];
  colours.forEach((c, i) => {
    const x = 26 + i * 6;
    const lean = (i - 3) * 1.4;
    const top = -16 + Math.abs(i - 3) * 2;
    for (let y = top; y <= 0; y++) {
      const t = (y - top) / -top;
      const cx = Math.round(x + lean * (1 - t));
      const tip = y < top + 3;
      if (y > top) {
        p.set(cx - 1, y, tip ? "#1b2430" : c);
        p.set(cx + 1, y, tip ? "#1b2430" : c);
      }
      p.set(cx, y, tip ? "#1b2430" : "#f6f0e4"); // quill
    }
  });
  // Woven band with a zig-zag
  p.rect(23, 1, 64, 5, "#8a4a25");
  for (let x = 23; x <= 64; x++) p.set(x, 2 + Math.abs((x % 4) - 2), "#f6c945");
  p.span(1, 23, 64, "#a8643a");
  p.span(5, 23, 64, "#6b3a1c");
  p.outline();
  return { front: p };
}

// Tribal: a carved wooden tiki mask over the face.
function tikiMask() {
  const p = canvas();
  const wood = "#9a6234";
  p.rect(29, 5, 58, 25, wood);
  p.span(26, 31, 56, wood);
  p.span(4, 31, 56, wood);
  erase(p, (x, y) => (x <= 30 || x >= 57) && (y <= 5 || y >= 25));
  p.shade({ light: "#b97c47", dark: "#74461f" });
  for (let x = 33; x <= 54; x += 3) p.set(x, 6, "#74461f");
  // Brow ridge, eyes, nose, grin
  p.span(9, 31, 56, "#5a3418");
  ellipse(p, 36.5, 13, 4, 3, "#1b1210");
  ellipse(p, 51, 13, 4, 3, "#1b1210");
  p.set(37, 12, "#f6c945");
  p.set(51, 12, "#f6c945");
  p.rect(42, 13, 45, 18, "#74461f");
  p.rect(33, 20, 54, 24, "#1b1210");
  for (let x = 34; x <= 52; x += 3) p.rect(x, 20, x + 1, 21, "#f6f0e4");
  for (let x = 35; x <= 53; x += 3) p.rect(x, 23, x + 1, 24, "#f6f0e4");
  // Red paint on the cheeks
  [30, 55].forEach((x) => {
    p.rect(x, 16, x + 2, 16, "#d63a3a");
    p.rect(x, 18, x + 2, 18, "#d63a3a");
  });
  p.outline("#3a2210");
  return { front: p };
}

// Tribal: bone beads and a big tooth on a cord, sagging over the beard.
function boneNecklace() {
  const p = canvas();
  const mid = (x) => 30 + Math.round(6 * (1 - ((x - 43.5) / 19) ** 2));
  for (let x = 25; x <= 62; x++) p.set(x, mid(x), "#5a3418");
  for (let x = 27; x <= 60; x += 4) {
    const y = mid(x);
    p.rect(x, y - 1, x + 1, y + 1, (x / 4) % 2 >= 1 ? "#f6f0e4" : "#d63a3a");
  }
  // Tooth pendant
  const y0 = mid(43) + 1;
  [[0, 3], [1, 3], [2, 2], [3, 2], [4, 1], [5, 1], [6, 0]].forEach(([dy, hw]) =>
    p.span(y0 + dy, 44 - hw, 43 + hw, "#f6f0e4"),
  );
  p.set(42, y0 + 1, "#ffffff");
  p.outline("#3a2210");
  return { front: p };
}

// Tribal: a tall spear held upright in the right hand, feathers below the tip.
function tribalSpear() {
  const p = canvas();
  p.rect(73, -6, 74, 92, "#7a5230");
  for (let y = -6; y <= 92; y += 5) p.set(73, y, "#9a6a40");
  // Stone tip
  [[-16, 0], [-15, 1], [-14, 1], [-13, 2], [-12, 2], [-11, 2], [-10, 1], [-9, 1], [-8, 0]].forEach(([y, hw]) =>
    p.span(y, 73 - hw, 74 + hw, "#9aa6b2"),
  );
  p.set(73, -14, "#d6dee6");
  p.set(73, -12, "#d6dee6");
  // Binding and feathers
  p.rect(72, -7, 75, -5, "#f6c945");
  p.rect(70, -4, 71, 4, "#d63a3a");
  p.rect(76, -4, 77, 2, "#2fb67a");
  // Grip wrap where the hand holds it
  for (let y = 62; y <= 72; y += 2) p.span(y, 73, 74, "#f08a2c");
  p.outline();
  return { front: p };
}

// Rogues: a deep hood over the head that drapes onto the shoulders, open
// at the face.
function rogueHood() {
  const p = canvas();
  const cloth = "#454857";
  ellipse(p, 43.5, 11, 23, 15, cloth);
  // Drape over the shoulders, either side of the beard
  for (let y = 18; y <= 33; y++) {
    const out = Math.round((y - 18) * 0.35);
    p.span(y, 20 - out, 29, cloth);
    p.span(y, 58, 67 + out, cloth);
  }
  // Face opening, cut down to the chin
  erase(p, (x, y) => y > 2 && (((x - 43.5) / 15.5) ** 2 + ((y - 13) / 11) ** 2 <= 1 || (y > 13 && Math.abs(x - 43.5) < 15.5 && y < 34)));
  p.shade({ light: "#5f6375", dark: "#30323d" });
  // A fold down each side and a shadowed rim
  for (let y = 4; y <= 30; y++) {
    p.set(24 - Math.max(0, y - 22), y, "#30323d");
    p.set(63 + Math.max(0, y - 22), y, "#30323d");
  }
  for (const pt of p.px.values())
    if (pt.y > 2 && ((pt.x - 43.5) / 17) ** 2 + ((pt.y - 13) / 12.5) ** 2 <= 1) pt.c = "#2a2c35";
  // Pointed peak
  p.span(-5, 42, 45, cloth);
  p.span(-6, 43, 44, cloth);
  p.set(44, -7, cloth);
  p.outline();
  return { front: p };
}

// Rogues: a domino mask across the eyes.
function dominoMask() {
  const p = canvas();
  const mask = "#3a1f4f";
  ellipse(p, 36.5, 13, 7, 4, mask);
  ellipse(p, 51, 13, 7, 4, mask);
  p.rect(37, 11, 50, 14, mask);
  p.span(9, 33, 40, "#5c3a7a");
  p.span(9, 47, 54, "#5c3a7a");
  // Eye holes
  ellipse(p, 36.5, 13, 2.6, 1.6, "#120a18");
  ellipse(p, 51, 13, 2.6, 1.6, "#120a18");
  p.set(36, 12, "#f6f0e4");
  p.set(50, 12, "#f6f0e4");
  // Ties
  line(p, 29, 12, 23, 10, mask);
  line(p, 58, 12, 64, 10, mask);
  p.outline();
  return { front: p };
}

// Rogues: a fat coin pouch dangling from the left hand.
function coinPouch() {
  const p = canvas();
  const leather = "#8a5a2e";
  ellipse(p, 19, 80, 7, 6, leather);
  p.rect(16, 71, 22, 74, leather);
  p.shade({ light: "#a87443", dark: "#64401f" });
  // Drawstring and the cord up into the hand
  p.span(74, 15, 23, "#c9a24a");
  p.rect(18, 66, 19, 70, "#c9a24a");
  // Coins peeking out, and one dropped on the floor
  ellipse(p, 18, 70, 2, 1.4, "#f2c14e");
  p.set(17, 70, "#fff0a8");
  ellipse(p, 29, 91, 2.5, 1.5, "#f2c14e");
  p.set(28, 91, "#fff0a8");
  // Stitched coin mark
  p.rect(18, 79, 20, 82, "#f2c14e");
  p.set(19, 80, "#c48d2c");
  p.outline();
  return { front: p };
}

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
  tricorn,
  eyepatch,
  cutlass,
  parrot,
  "feather-headdress": featherHeaddress,
  "tiki-mask": tikiMask,
  "bone-necklace": boneNecklace,
  "tribal-spear": tribalSpear,
  "rogue-hood": rogueHood,
  "domino-mask": dominoMask,
  "coin-pouch": coinPouch,
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

// { [wearableId]: { back: runs|null, front: runs, icon: runs|null, bounds } }
export const wearableArt = Object.fromEntries(
  Object.entries(DRAW).map(([id, draw]) => {
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
);
