// Builds Fuchey artwork from source:
//   - nft/out/images/<id>.png        NFT images for characters and wearables
//   - nft/out/preview.png            every Wild wearable on the Yeti (for review)
//
// Usage: node make-art.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { wearableArt, gearFits, SLOT_ORDER } from "../supabase/seed/wearableArt.js";

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

const opaque = (c) => c && c[3] >= 128;

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
  if (art.icon) drawRuns(grid, art.icon, ox, oy);
  else {
    if (art.back) drawRuns(grid, art.back, ox, oy);
    drawRuns(grid, art.front, ox, oy);
  }
  return { grid, scale: Math.max(1, Math.floor(384 / side)) || size };
}

// --- run ------------------------------------------------------------------------
const yeti = readGrid(path.join(ASSETS, "yeti.png"));
fs.copyFileSync(path.join(ASSETS, "yeti.png"), path.join(OUT, "yeti.png"));

const SLOTS = {
  "blue-beanie": "hat", "glacier-crown": "hat", "signal-headphones": "headwear", "dev-visor": "headwear",
  "pixel-glasses": "accessory", "frost-scarf": "accessory", "snow-globe": "held", "explorer-jacket": "outfit",
  "circuit-hoodie": "outfit", "solana-backpack": "backpack", "genesis-halo": "special",
  "dhaka-topi": "hat", "daura-suruwal": "outfit",
};

for (const id of Object.keys(wearableArt)) {
  const { grid, scale } = icon(id);
  writeGrid(grid, path.join(OUT, `${id}.png`), scale);
}

// Preview sheet: the Yeti, one column per wearable + combos.
// Pack gear is drawn for its pack's characters, not the Yeti, so it's left out.
const looks = [
  [],
  ...Object.keys(wearableArt).filter((id) => !gearFits[id]).map((id) => [id]),
  ["blue-beanie", "frost-scarf", "explorer-jacket"],
  ["dev-visor", "circuit-hoodie", "solana-backpack"],
  ["glacier-crown", "pixel-glasses", "solana-backpack", "explorer-jacket"],
  ["signal-headphones", "pixel-glasses", "frost-scarf"],
  ["blue-beanie", "frost-scarf", "snow-globe"],
  ["dhaka-topi", "daura-suruwal"],
];
const cellW = N + 8;
const cellH = N + 28;
const sheet = blank(cellW * looks.length, cellH).map((row) => row.map(() => [238, 243, 246, 255]));
looks.forEach((ids, i) => {
  const g = compose(yeti, ids.map((id) => ({ id, slot: SLOTS[id] })));
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < N; x++) if (g[y][x][3]) sheet[y + 4][i * cellW + x + 4] = g[y][x];
});
writeGrid(sheet, path.join(here, "out/preview.png"), 2);
console.log("Art written to", path.relative(process.cwd(), OUT));
