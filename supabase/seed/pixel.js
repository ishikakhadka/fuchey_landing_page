// Tiny pixel canvas shared by the seed art: wearables (wearableArt.js) and
// the pack characters (sprites.js).
//
// canvas(k) draws in "units" but stores pixels k times finer. The pack art is
// designed on a 48-unit grid and drawn with k = 2, so it comes out on the same
// native 96×96 grid as the Yeti: shapes are sampled at full resolution (smooth
// curves), outlines and shading rims are 1 real pixel thin, and only
// deliberately placed details (set / rect / span) are a whole unit wide.
// With k = 1 (the default) units and pixels are the same thing.
//
// `px` holds real pixels: { x, y, c } in pixel coordinates. setPx / hasPx /
// getPx work on pixels; set / has / get / span / rect work on units.

export const OUTLINE = "#0b0f17";

export const paint = (c, x, y) => (typeof c === "function" ? c(x, y) : c);

export function canvas(k = 1) {
  const px = new Map();
  const key = (x, y) => `${x},${y}`;

  const api = {
    px,
    k,
    setPx(x, y, c) {
      px.set(key(x, y), { x, y, c });
    },
    getPx(x, y) {
      return px.get(key(x, y))?.c;
    },
    hasPx(x, y) {
      return px.has(key(x, y));
    },
    deletePx(x, y) {
      px.delete(key(x, y));
    },
    set(x, y, c) {
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) api.setPx(x * k + dx, y * k + dy, c);
    },
    get(x, y) {
      return api.getPx(x * k, y * k);
    },
    has(x, y) {
      return api.hasPx(x * k, y * k);
    },
    span(y, x0, x1, c) {
      for (let x = x0; x <= x1; x++) api.set(x, y, paint(c, x, y));
    },
    rect(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) api.span(y, x0, x1, c);
    },
    // Recolour pixels on the edges of the current shape: light along the
    // top, dark along the bottom and right (`depth` pixels deep).
    shade({ light, dark }, only, depth = 1) {
      const next = [];
      const open = (x, y, dx, dy) => {
        for (let i = 1; i <= depth; i++) if (!api.hasPx(x + dx * i, y + dy * i)) return true;
        return false;
      };
      for (const p of px.values()) {
        if (only && !only.includes(p.c)) continue;
        if (!api.hasPx(p.x, p.y - 1)) next.push([p.x, p.y, light]);
        else if (open(p.x, p.y, 0, 1) || open(p.x, p.y, 1, 0)) next.push([p.x, p.y, dark]);
      }
      next.forEach(([x, y, c]) => c && api.setPx(x, y, c));
    },
    // 1px outline around everything drawn so far.
    outline(c = OUTLINE) {
      const ring = new Set();
      for (const p of px.values()) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const kk = key(p.x + dx, p.y + dy);
          if (!px.has(kk)) ring.add(kk);
        }
      }
      ring.forEach((kk) => {
        const [x, y] = kk.split(",").map(Number);
        api.setPx(x, y, c);
      });
    },
    // Merge horizontal runs of one colour → [{ x, y, w, c }] (pixels).
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

// ---------------------------------------------------------------------------
// Shapes, in units, sampled at the canvas's full resolution. `c` is a colour,
// or (x, y) => colour with unit coordinates.
// ---------------------------------------------------------------------------

// Every pixel of the canvas whose centre, in units (unit x's centre is x),
// falls in the box [x0 - .5, x1 + .5] × [y0 - .5, y1 + .5].
function sample(p, x0, y0, x1, y1, inside, c) {
  const k = p.k;
  for (let Y = Math.floor((y0 - 1) * k); Y <= Math.ceil((y1 + 2) * k); Y++)
    for (let X = Math.floor((x0 - 1) * k); X <= Math.ceil((x1 + 2) * k); X++) {
      const u = (X + 0.5) / k - 0.5;
      const v = (Y + 0.5) / k - 0.5;
      if (inside(u, v)) p.setPx(X, Y, paint(c, Math.floor(X / k), Math.floor(Y / k)));
    }
}

// Rectangle (units x0..x1, y0..y1 inclusive) with rounded corners of radius r.
export function roundRect(p, x0, y0, x1, y1, r, c) {
  const L = x0 - 0.5;
  const R = x1 + 0.5;
  const T = y0 - 0.5;
  const B = y1 + 0.5;
  sample(
    p,
    x0,
    y0,
    x1,
    y1,
    (u, v) => {
      if (u < L || u > R || v < T || v > B) return false;
      const dx = Math.max(0, L + r - u, u - (R - r));
      const dy = Math.max(0, T + r - v, v - (B - r));
      return dx * dx + dy * dy <= r * r;
    },
    c,
  );
}

export function ellipse(p, cx, cy, rx, ry, c) {
  sample(p, cx - rx, cy - ry, cx + rx, cy + ry, (u, v) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1, c);
}

// Filled polygon (even-odd), vertices in units.
export function polygon(p, pts, c) {
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  sample(
    p,
    Math.floor(Math.min(...xs)),
    Math.floor(Math.min(...ys)),
    Math.ceil(Math.max(...xs)),
    Math.ceil(Math.max(...ys)),
    (u, v) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    c,
  );
}

// A thin line between the centres of two units (Bresenham on pixels), half
// a unit wide on fine canvases: for straps, cords and brows.
export function line(p, x0, y0, x1, y1, c) {
  const k = p.k;
  const t = Math.max(1, Math.floor(k / 2));
  const at = (u) => Math.round(u * k + (k - 1) / 2);
  let X0 = at(x0);
  let Y0 = at(y0);
  const X1 = at(x1);
  const Y1 = at(y1);
  const dx = Math.abs(X1 - X0);
  const dy = -Math.abs(Y1 - Y0);
  const sx = X0 < X1 ? 1 : -1;
  const sy = Y0 < Y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    for (let dy = 0; dy < t; dy++)
      for (let dx = 0; dx < t; dx++) p.setPx(X0 + dx, Y0 + dy, paint(c, Math.floor(X0 / k), Math.floor(Y0 / k)));
    if (X0 === X1 && Y0 === Y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      X0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      Y0 += sy;
    }
  }
}

// Remove every pixel whose unit (x, y) passes test(x, y).
export function erase(p, test) {
  for (const pt of [...p.px.values()])
    if (test(Math.floor(pt.x / p.k), Math.floor(pt.y / p.k))) p.px.delete(`${pt.x},${pt.y}`);
}

// Paint a pixel map, one unit per character: rows of characters, "." clear.
export function stamp(p, x0, y0, rows, palette) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== "." && p.set(x0 + i, y0 + j, palette[ch])));
}

// Paint a pixel map at full resolution: one real pixel per character, with
// (x0, y0) in units. For small, detailed things (a bird, a skull).
export function stampPx(p, x0, y0, rows, palette) {
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => ch !== "." && p.setPx(x0 * p.k + i, y0 * p.k + j, palette[ch])),
  );
}

// Blend two #rrggbb colours (t = 0 → a, 1 → b).
export function mix(a, b, t) {
  const ch = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, "0"))
    .join("")}`;
}

// Soft volume on a part's base colour, lit from the upper left like the
// Yeti: a lighter patch towards the top-left, a half-shadow towards the
// bottom and right. Only on parts big enough to read it.
function form(part, tone) {
  const pts = [...part.px.values()].filter((pt) => pt.c === tone.b);
  if (pts.length < 40) return;
  const xs = pts.map((pt) => pt.x);
  const ys = pts.map((pt) => pt.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  const lit = mix(tone.b, tone.l, 0.45);
  const half = mix(tone.b, tone.d, 0.5);
  for (const pt of pts) {
    const u = (pt.x - x0) / w;
    const v = (pt.y - y0) / h;
    if (u + v * 0.9 > 1.25 || u > 0.84 || v > 0.8) pt.c = half;
    else if (u < 0.32 && v < 0.34 && u + v < 0.5) pt.c = lit;
  }
}

// Draw `part` onto `p` with a 1px outline of its own, so a part that
// overlaps earlier ones (an arm over the body, a head over the neck) stays a
// clean, separate shape. `tone` = { b, l, d } shades it first: a light rim
// along the top, a dark rim (one unit deep) along the bottom and right, and on
// fine canvases soft volume in between.
export function layer(p, part, tone, outline = OUTLINE) {
  if (tone) {
    part.shade({ light: tone.l, dark: tone.d }, [tone.b], part.k);
    if (part.k > 1) form(part, tone);
  }
  // The outline is half a unit thick (one pixel on coarse canvases).
  let edge = new Set([...part.px.keys()]);
  const ring = new Set();
  for (let i = 0; i < Math.max(1, Math.floor(part.k / 2)); i++) {
    const next = new Set();
    for (const kk of edge) {
      const [x, y] = kk.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${x + dx},${y + dy}`;
        if (!part.px.has(nk) && !ring.has(nk)) {
          ring.add(nk);
          next.add(nk);
        }
      }
    }
    edge = next;
  }
  for (const kk of ring) {
    const [x, y] = kk.split(",").map(Number);
    p.setPx(x, y, outline);
  }
  for (const pt of part.px.values()) p.setPx(pt.x, pt.y, pt.c);
}

// A shape drawn on its own canvas (same scale as `k`), ready to layer.
export function part(shape, k = 1) {
  const q = canvas(k);
  shape(q);
  return q;
}

// Canvas → sprite data { palette, rows } on a size × size pixel grid (pixels
// outside it are dropped). Palette keys are assigned per colour.
export function toSprite(p, size) {
  const KEYS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const keyOf = new Map();
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) {
      const c = p.getPx(x, y);
      if (!c) {
        row += ".";
        continue;
      }
      if (!keyOf.has(c)) keyOf.set(c, KEYS[keyOf.size]);
      row += keyOf.get(c);
    }
    rows.push(row);
  }
  if (keyOf.size > KEYS.length) throw new Error(`toSprite: ${keyOf.size} colours, max ${KEYS.length}`);
  return { palette: Object.fromEntries([...keyOf].map(([c, kk]) => [kk, c])), rows };
}
