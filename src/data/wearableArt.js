// Wearable pixel art, drawn on the Yeti's native 96×96 grid.
//
// yeti.png is 96×96 pixel art scaled ×4. Every wearable here is drawn in
// those same grid coordinates, so layering it over the base character lines
// up pixel-for-pixel — no per-item CSS nudging. Rows may go negative (above
// the head) for hats and halos; renderers leave headroom for that.
//
// Each wearable has a `front` layer (drawn over the character) and optionally
// a `back` layer (drawn behind it, e.g. the backpack's bag). Card icons are
// the same layers cropped to their bounding box.
//
// Plain data + functions, no imports: the NFT tooling in nft/ imports this
// file too, to render the PNGs that go on-chain.

const OUTLINE = "#0b0f17";

// Interior of the torso between the arm seams, per row (from yeti.png).
const TORSO = {};
[
  [27, 28, 59], [28, 28, 59], [29, 28, 58], [30, 28, 58], [31, 28, 58],
  [32, 28, 57], [33, 28, 56], [34, 28, 56], [35, 28, 55], [36, 28, 55],
  [37, 28, 54], [38, 28, 56], [39, 27, 56], [40, 27, 56], [41, 27, 56],
  [42, 26, 56], [43, 26, 56], [44, 26, 56], [45, 26, 56], [46, 25, 56],
  [47, 25, 55], [48, 25, 54], [49, 24, 54], [50, 24, 54], [51, 24, 54],
  [52, 24, 54], [53, 24, 54], [54, 24, 54], [55, 24, 53], [56, 24, 53],
  [57, 25, 53], [58, 25, 53], [59, 25, 53], [60, 25, 53],
].forEach(([y, l, r]) => (TORSO[y] = [l, r]));

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
// coral band, darker coral tail, light stripe blocks), wrapped around the neck
// just under the beard instead of floating across the chest.
function scarf() {
  const p = canvas();
  const coral = "#f08a64";
  const shade = "#d8704e";
  const light = "#ffd3bf";

  // Band hugging the neck, following the shoulder line
  p.span(28, 28, 59, coral);
  p.span(29, 26, 61, coral);
  p.span(30, 26, 61, coral);
  p.span(31, 26, 61, coral);
  p.span(32, 28, 59, coral);
  p.span(28, 30, 57, "#f7a585");
  p.span(32, 28, 59, shade);
  [30, 37, 44].forEach((x) => p.rect(x, 30, x + 2, 30, light));

  // Knot on the right and a tail that hangs down the chest
  p.rect(49, 29, 55, 34, shade);
  p.span(29, 50, 54, coral);
  for (let y = 35; y <= 47; y++) {
    const sway = y > 41 ? 1 : 0;
    p.span(y, 50 + sway, 55 + sway, y % 6 === 2 ? light : y >= 46 ? shade : coral);
    p.set(55 + sway, y, shade);
  }
  p.outline("#7a3a24");
  // Fringe
  [51, 53, 55].forEach((x) => p.set(x, 49, light));
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

// Shared torso silhouette for outfits.
function torso(p, { from = 29, to = 60, shoulders = true, open } = {}) {
  for (let y = shoulders ? 27 : from; y <= to; y++) {
    const [l, r] = TORSO[y];
    for (let x = l; x <= r; x++) {
      // Shoulders only outside the beard (rows above `from`)
      if (y < from && x > 31 && x < 55) continue;
      if (open && open(x, y)) continue;
      p.set(x, y, "BASE");
    }
  }
}

function paint(p, palette) {
  for (const pt of p.px.values()) if (pt.c === "BASE") pt.c = palette.base;
  p.shade({ light: palette.light, dark: palette.dark }, [palette.base]);
}

function jacket() {
  const p = canvas();
  const vNeck = (x, y) => {
    if (y > 41) return false;
    const hw = Math.round((41 - y) * 0.55) + 1;
    return x >= 44 - hw && x <= 43 + hw;
  };
  torso(p, { open: vNeck });
  paint(p, { base: "#c99c5a", light: "#e2bd80", dark: "#9b7340" });
  // Lapels along the V
  for (let y = 29; y <= 41; y++) {
    const hw = Math.round((41 - y) * 0.55) + 1;
    p.set(43 - hw, y, "#e8c98f");
    p.set(44 + hw, y, "#e8c98f");
    p.set(42 - hw, y, "#9b7340");
    p.set(45 + hw, y, "#9b7340");
  }
  // Zip + pockets + hem
  p.rect(43, 42, 44, 58, "#f3e2b8");
  for (let y = 43; y <= 58; y += 3) p.set(43, y, "#9b7340");
  p.rect(30, 46, 37, 51, "#b38646");
  p.span(46, 30, 37, "#8a6436");
  p.rect(48, 46, 53, 51, "#b38646");
  p.span(46, 48, 53, "#8a6436");
  p.set(33, 47, "#f3e2b8");
  p.set(50, 47, "#f3e2b8");
  p.span(59, 25, 53, "#8a6436");
  p.span(60, 25, 53, "#8a6436");
  p.outline("#3b2a17");
  return { front: p };
}

function hoodie() {
  const p = canvas();
  torso(p);
  paint(p, { base: "#1a2b45", light: "#2b4468", dark: "#0f1a2c" });
  // Collar
  p.span(29, 33, 54, "#0f1a2c");
  p.span(30, 35, 52, "#24395a");
  // Drawstrings
  p.rect(39, 31, 39, 36, "#e6f1f7");
  p.rect(48, 31, 48, 35, "#e6f1f7");
  // Circuit traces
  p.rect(33, 35, 33, 50, "#38d6ee");
  p.span(42, 33, 38, "#38d6ee");
  p.rect(38, 42, 39, 43, "#9b86ff");
  p.rect(53, 33, 53, 47, "#38d6ee");
  p.span(38, 48, 53, "#38d6ee");
  p.rect(47, 38, 48, 39, "#9b86ff");
  p.set(33, 51, "#7fe9ff");
  p.set(53, 48, "#7fe9ff");
  // Kangaroo pocket
  p.rect(36, 50, 51, 56, "#14223a");
  p.span(50, 36, 51, "#38d6ee");
  p.span(59, 25, 53, "#0f1a2c");
  p.span(60, 25, 53, "#0f1a2c");
  p.outline("#04070d");
  return { front: p };
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

  const front = canvas();
  const strap = mixRows([[0, "#14f195"], [36, "#57b7e0"], [44, "#9945ff"]]);
  for (let y = 26; y <= 52; y++) {
    const [l, r] = TORSO[Math.max(27, y)];
    front.span(y, l + 1, l + 4, strap);
    if (y <= 50) front.span(y, r - 4, r - 1, strap);
  }
  // Chest strap + buckle
  front.span(40, 33, 53, "#1d2433");
  front.span(41, 33, 53, "#1d2433");
  front.rect(41, 39, 46, 42, "#c9d3df");
  front.rect(42, 40, 45, 41, "#7d8a99");
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

// { [wearableId]: { back: runs|null, front: runs, bounds } }
export const wearableArt = Object.fromEntries(
  Object.entries(DRAW).map(([id, draw]) => {
    const { back, front } = draw();
    const backRuns = back ? back.runs() : null;
    const frontRuns = front.runs();
    return [id, { back: backRuns, front: frontRuns, bounds: bounds([...(backRuns ?? []), ...frontRuns]) }];
  }),
);
