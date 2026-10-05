// Builds Fuchey artwork from source:
//   - src/assets/cyber-yeti.png      cyberpunk recolour of the Yeti (96×96 ×4)
//   - nft/out/images/<id>.png        NFT images for characters and wearables
//   - nft/out/preview.png            every wearable on both characters (for review)
//
// Usage: node make-art.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { wearableArt, SLOT_ORDER } from "../src/data/wearableArt.js";

const { PNG } = pngjs;
const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, "../src/assets");
const OUT = path.join(here, "out/images");
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 4;
const N = 96;

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// --- read the Yeti into a 96×96 grid of [r,g,b,a] --------------------------
function readGrid(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const grid = [];
  for (let y = 0; y < N; y++) {
    const row = [];
    for (let x = 0; x < N; x++) {
      const i = ((y * SCALE + 1) * png.width + (x * SCALE + 1)) * 4;
      row.push([...png.data.slice(i, i + 4)]);
    }
    grid.push(row);
  }
  return grid;
}

function writeGrid(grid, file, scale = SCALE) {
  const h = grid.length;
  const w = grid[0].length;
  const png = new PNG({ width: w * scale, height: h * scale });
  for (let y = 0; y < h * scale; y++) {
    for (let x = 0; x < w * scale; x++) {
      const c = grid[Math.floor(y / scale)][Math.floor(x / scale)] ?? [0, 0, 0, 0];
      const i = (y * w * scale + x) * 4;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = c[3];
    }
  }
  fs.writeFileSync(file, PNG.sync.write(png));
}

const lum = ([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11;
const opaque = (c) => c && c[3] >= 128;

// --- Cyber Yeti --------------------------------------------------------------
// Dev-edition recolours of the original Yeti. Each style maps the original's
// brightness bands (fur / light shading / mid shading / dark blue) to a new
// palette, with a separate palette for the face mask, and glowing eyes.
const CYBER_STYLES = {
  dev: {
    label: "Dev Yeti",
    fur: ["#ffffff", "#d9f3f8", "#7fd6e6", "#2a9fb8"],
    mask: ["#101a2e", "#1c2a45"],
    eyes: ["#7ff3ff", "#38d6ee"],
    ears: "#38d6ee",
  },
  midnight: {
    label: "Midnight Yeti",
    fur: ["#dfe3f7", "#bcc3ea", "#8b93c8", "#414889"],
    mask: ["#232850", "#30366a"],
    eyes: ["#a8f6ff", "#5ee2f5"],
    ears: "#9b86ff",
  },
  robo: {
    label: "Robo Yeti",
    fur: ["#e6ebf0", "#c6cfd9", "#8f9bab", "#4b5a6a"],
    mask: ["#0f1620", "#1c2633"],
    eyes: ["#7ff3ff", "#38d6ee"],
    ears: "#f08a64",
  },
};
const CYBER_STYLE = process.env.CYBER_STYLE ?? "midnight";

function cyberYeti(src, style = CYBER_STYLES[CYBER_STYLE]) {
  const isOutline = (x, y) => opaque(src[y]?.[x]) && lum(src[y][x]) < 50;
  const inMask = (x, y) => y >= 7 && y <= 20 && x >= 31 && x <= 56;
  const inEar = (x, y) => y >= 13 && y <= 18 && ((x >= 24 && x <= 25) || (x >= 63 && x <= 64));

  const out = src.map((row, y) =>
    row.map((c, x) => {
      if (!opaque(c)) return [0, 0, 0, 0];
      const L = lum(c);
      if (L < 50) return [...hex("#0b0f1a"), 255];
      if (inMask(x, y) && L < 165) return [...hex(L < 110 ? style.mask[0] : style.mask[1]), 255];
      if (inEar(x, y) && L < 165) return [...hex(style.ears), 255];
      const band = L < 110 ? 3 : L < 165 ? 2 : L < 225 ? 1 : 0;
      return [...hex(style.fur[band]), 255];
    }),
  );

  // Glowing eyes (the eye blocks are outline-dark on the original)
  const eye = (x0) => {
    for (let y = 12; y <= 15; y++)
      for (let x = x0; x <= x0 + 4; x++) if (isOutline(x, y)) out[y][x] = [...hex(y === 12 ? style.eyes[0] : style.eyes[1]), 255];
    out[13][x0 + 2] = [255, 255, 255, 255];
  };
  eye(35);
  eye(48);
  return out;
}

// --- compositing --------------------------------------------------------------
function drawRuns(grid, runs, ox, oy) {
  for (const r of runs) {
    for (let i = 0; i < r.w; i++) {
      const x = r.x + i + ox;
      const y = r.y + oy;
      if (grid[y] && x >= 0 && x < grid[y].length) grid[y][x] = [...hex(r.c), 255];
    }
  }
}

function blank(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0, 0, 0]));
}

function compose(base, ids, { pad = 20 } = {}) {
  const grid = blank(N, N + pad);
  const sorted = [...ids].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  for (const { id } of sorted) if (wearableArt[id].back) drawRuns(grid, wearableArt[id].back, 0, pad);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (opaque(base[y][x])) grid[y + pad][x] = base[y][x];
  for (const { id } of sorted) drawRuns(grid, wearableArt[id].front, 0, pad);
  return grid;
}

function icon(id, size = 48) {
  const art = wearableArt[id];
  const { x, y, w, h } = art.bounds;
  const side = Math.max(w, h) + 6;
  const ox = Math.floor((side - w) / 2) - x;
  const oy = Math.floor((side - h) / 2) - y;
  const grid = blank(side, side);
  if (art.back) drawRuns(grid, art.back, ox, oy);
  drawRuns(grid, art.front, ox, oy);
  return { grid, scale: Math.max(1, Math.floor(384 / side)) || size };
}

// --- run ------------------------------------------------------------------------
const yeti = readGrid(path.join(ASSETS, "yeti.png"));
const cyber = cyberYeti(yeti);

// Side-by-side sheet of every Cyber style, for choosing a look.
{
  const styles = Object.values(CYBER_STYLES);
  const sheet = blank((N + 8) * (styles.length + 1), N + 8).map((row) => row.map(() => [14, 27, 45, 255]));
  [yeti, ...styles.map((st) => cyberYeti(yeti, st))].forEach((g, i) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x][3]) sheet[y + 4][i * (N + 8) + x + 4] = g[y][x];
  });
  writeGrid(sheet, path.join(here, "out/cyber-options.png"), 3);
}
writeGrid(cyber, path.join(ASSETS, "cyber-yeti.png"));
fs.copyFileSync(path.join(ASSETS, "yeti.png"), path.join(OUT, "yeti.png"));
fs.copyFileSync(path.join(ASSETS, "cyber-yeti.png"), path.join(OUT, "cyber.png"));

const SLOTS = {
  "blue-beanie": "hat", "glacier-crown": "hat", "signal-headphones": "headwear", "dev-visor": "headwear",
  "pixel-glasses": "accessory", "frost-scarf": "accessory", "snow-globe": "held", "explorer-jacket": "outfit",
  "circuit-hoodie": "outfit", "solana-backpack": "backpack", "genesis-halo": "special",
};

for (const id of Object.keys(wearableArt)) {
  const { grid, scale } = icon(id);
  writeGrid(grid, path.join(OUT, `${id}.png`), scale);
}

// Preview sheet: row 1 = Yeti, row 2 = Cyber; one column per wearable + combos.
const looks = [
  [],
  ...Object.keys(wearableArt).map((id) => [id]),
  ["blue-beanie", "frost-scarf", "explorer-jacket"],
  ["dev-visor", "circuit-hoodie", "solana-backpack"],
  ["glacier-crown", "pixel-glasses", "solana-backpack", "explorer-jacket"],
  ["signal-headphones", "pixel-glasses", "frost-scarf"],
  ["blue-beanie", "frost-scarf", "snow-globe"],
];
const cellW = N + 8;
const cellH = N + 28;
const sheet = blank(cellW * looks.length, cellH * 2).map((row) => row.map(() => [238, 243, 246, 255]));
[yeti, cyber].forEach((base, r) => {
  looks.forEach((ids, i) => {
    const g = compose(base, ids.map((id) => ({ id, slot: SLOTS[id] })));
    for (let y = 0; y < g.length; y++)
      for (let x = 0; x < N; x++) if (g[y][x][3]) sheet[r * cellH + y + 4][i * cellW + x + 4] = g[y][x];
  });
});
writeGrid(sheet, path.join(here, "out/preview.png"), 2);
console.log("Art written to", path.relative(process.cwd(), OUT), "and src/assets/cyber-yeti.png");
