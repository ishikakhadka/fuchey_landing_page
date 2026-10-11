// Tiny pixel canvas shared by the seed art: wearables (wearableArt.js) and
// the pack characters (sprites.js). Coordinates are integers on whatever grid
// the caller draws on; nothing here knows about 96×96 or 48×48.

export const OUTLINE = "#0b0f17";

export function canvas() {
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

// ---------------------------------------------------------------------------
// Shapes. `c` is a colour, or (x, y) => colour.
// ---------------------------------------------------------------------------

export const paint = (c, x, y) => (typeof c === "function" ? c(x, y) : c);

// Rectangle with rounded corners of radius r.
export function roundRect(p, x0, y0, x1, y1, r, c) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0;
      const dy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0;
      if (dx * dx + dy * dy <= r * r) p.set(x, y, paint(c, x, y));
    }
}

export function ellipse(p, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) p.set(x, y, paint(c, x, y));
}

// Filled polygon (even-odd, pixel centres).
export function polygon(p, pts, c) {
  const ys = pts.map(([, y]) => y);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...pts.map(([px]) => px))); x <= Math.ceil(Math.max(...pts.map(([px]) => px))); x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) p.set(x, y, paint(c, x, y));
    }
}

// Straight 1px line (Bresenham).
export function line(p, x0, y0, x1, y1, c) {
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

// Remove every pixel where test(x, y) holds.
export function erase(p, test) {
  for (const pt of [...p.px.values()]) if (test(pt.x, pt.y)) p.px.delete(`${pt.x},${pt.y}`);
}

// Paint a pixel map: rows of characters, "." transparent.
export function stamp(p, x0, y0, rows, palette) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== "." && p.set(x0 + i, y0 + j, palette[ch])));
}

// Draw `part` onto `p` with a 1px outline of its own, so a part that
// overlaps earlier ones (an arm over the body, a head over the neck) stays a
// clean, separate shape. `tone` = { b, l, d } shades it first: light along
// the top, dark along the bottom and right.
export function layer(p, part, tone, outline = OUTLINE) {
  if (tone) part.shade({ light: tone.l, dark: tone.d }, [tone.b]);
  for (const pt of part.px.values())
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (!part.has(pt.x + dx, pt.y + dy)) p.set(pt.x + dx, pt.y + dy, outline);
  for (const pt of part.px.values()) p.set(pt.x, pt.y, pt.c);
}

// A shape drawn on its own canvas, ready to layer: shape(part) fills it.
export function part(shape) {
  const q = canvas();
  shape(q);
  return q;
}

// Canvas → sprite data { palette, rows } on a size × size grid (pixels
// outside it are dropped). Palette keys are assigned per colour.
export function toSprite(p, size) {
  const KEYS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const keyOf = new Map();
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) {
      const c = p.get(x, y);
      if (!c) {
        row += ".";
        continue;
      }
      if (!keyOf.has(c)) keyOf.set(c, KEYS[keyOf.size]);
      row += keyOf.get(c);
    }
    rows.push(row);
  }
  return { palette: Object.fromEntries([...keyOf].map(([c, k]) => [k, c])), rows };
}
