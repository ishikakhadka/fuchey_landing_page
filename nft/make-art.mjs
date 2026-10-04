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
function cyberYeti(src) {
  const isOutline = (x, y) => opaque(src[y]?.[x]) && lum(src[y][x]) < 50;
  const out = src.map((row, y) =>
    row.map((c, x) => {
      if (!opaque(c)) return [0, 0, 0, 0];
      const L = lum(c);

      // Chest harness (the dark V on the original) glows neon. The V sits
      // between the arm seams, which stay as plain outline.
      const vRight = y < 47 ? 55 : y < 51 ? 54 : 53;
      const inV = y >= 35 && y <= 54 && x >= 29 && x <= vRight && L < 110;
      if (inV) return [...hex(L < 50 ? (y < 45 ? "#ff3ea5" : "#c45cff") : "#7a1f63"), 255];

      if (L < 50) return [...hex("#05060c"), 255];

      // Mask around the eyes
      if (y >= 7 && y <= 20 && x >= 31 && x <= 56 && L < 165) return [...hex("#0d1222"), 255];

      if (L < 110) return [...hex("#151a2c"), 255];
      if (L < 165) return [...hex("#1d2440"), 255];
      if (L < 225) return [...hex("#2b3558"), 255];
      return [...hex("#36426b"), 255];
    }),
  );

  // Neon rim light: cyan on top/left edges, magenta on bottom/right edges.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!opaque(src[y][x]) || isOutline(x, y)) continue;
      const inMask = y >= 7 && y <= 20 && x >= 31 && x <= 56;
      if (inMask) continue;
      if (isOutline(x - 1, y) || isOutline(x, y - 1)) out[y][x] = [...hex("#38d6ee"), 255];
      else if (isOutline(x + 1, y) || isOutline(x, y + 1)) out[y][x] = [...hex("#9b3fd6"), 255];
    }
  }

  // Glowing eyes
  const eye = (x0) => {
    for (let y = 12; y <= 15; y++)
      for (let x = x0; x <= x0 + 4; x++) if (isOutline(x, y)) out[y][x] = [...hex(y === 12 ? "#7ff3ff" : "#38d6ee"), 255];
    out[13][x0 + 2] = [255, 255, 255, 255];
  };
  eye(35);
  eye(48);

  // Circuit traces on the arms
  for (let y = 44; y <= 54; y++) out[y][18] = [...hex("#38d6ee"), 255];
  out[55][18] = [...hex("#e6fbff"), 255];
  out[44][19] = [...hex("#38d6ee"), 255];
  for (let y = 40; y <= 52; y++) out[y][66] = [...hex("#ff3ea5"), 255];
  out[53][66] = [...hex("#ffd1ea"), 255];
  out[40][65] = [...hex("#ff3ea5"), 255];

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
writeGrid(cyber, path.join(ASSETS, "cyber-yeti.png"));
fs.copyFileSync(path.join(ASSETS, "yeti.png"), path.join(OUT, "yeti.png"));
fs.copyFileSync(path.join(ASSETS, "cyber-yeti.png"), path.join(OUT, "cyber.png"));

const SLOTS = {
  "blue-beanie": "hat", "glacier-crown": "hat", "signal-headphones": "headwear", "dev-visor": "headwear",
  "pixel-glasses": "accessory", "frost-scarf": "accessory", "explorer-jacket": "outfit",
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
