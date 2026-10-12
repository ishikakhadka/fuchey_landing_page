// Toolkit for the vector packs (cartoonArt.js, animeArt.js) — SEED DATA ONLY.
//
// Smooth, hand-drawn-style art instead of pixels: every part is a closed
// shape with a bold ink outline and two-tone cel shading. Art is stored as
// shapes { d, fill, stroke, sw, op } (SVG path data using only M / L / C / Q /
// Z with absolute coordinates) on the same 96×96 grid as every other
// character, so the renderer, the wardrobe and the admin treat it alike.
//
// Every vector character is built on one body frame (FRAME below): the same
// head, body, arms, hands, legs and feet, so a wearable drawn for the frame
// fits every character drawn on it. What makes each one distinct is drawn on
// top: ears, hair, faces, clothes, tails.

export const INK = "#2d2440";
const SW = 1.5;
const r2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Shapes: { kind: "ell", cx, cy, rx, ry } or { kind: "pts", pts } (a closed,
// smoothed outline through the points).
// ---------------------------------------------------------------------------

export const ell = (cx, cy, rx, ry = rx) => ({ kind: "ell", cx, cy, rx, ry });
export const pts = (list) => ({ kind: "pts", pts: list });
export const mirror = (list, cx = 48) => list.map(([x, y]) => [2 * cx - x, y]).reverse();

// Rounded rectangle as smoothed points (a soft, slightly bulging box).
export function box(x0, y0, x1, y1, r) {
  const out = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 2; i++) {
      const a = a0 + (i * Math.PI) / 4;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return pts(out);
}

const K = 0.5523;
export function ellD({ cx, cy, rx, ry }) {
  const p = (x, y) => `${r2(x)} ${r2(y)}`;
  return (
    `M${p(cx - rx, cy)}` +
    `C${p(cx - rx, cy - ry * K)} ${p(cx - rx * K, cy - ry)} ${p(cx, cy - ry)}` +
    `C${p(cx + rx * K, cy - ry)} ${p(cx + rx, cy - ry * K)} ${p(cx + rx, cy)}` +
    `C${p(cx + rx, cy + ry * K)} ${p(cx + rx * K, cy + ry)} ${p(cx, cy + ry)}` +
    `C${p(cx - rx * K, cy + ry)} ${p(cx - rx, cy + ry * K)} ${p(cx - rx, cy)}Z`
  );
}

// Closed Catmull-Rom spline through the points, as cubic Béziers.
function smoothD(list) {
  const n = list.length;
  const at = (i) => list[(i + n) % n];
  let d = `M${r2(list[0][0])} ${r2(list[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return `${d}Z`;
}

// A polygon with straight edges (stars, triangles).
const polyD = (list) => `M${list.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L")}Z`;

const D = (s) => (s.kind === "ell" ? ellD(s) : s.straight ? polyD(s.pts) : smoothD(s.pts));

function bbox(s) {
  if (s.kind === "ell") return { x0: s.cx - s.rx, y0: s.cy - s.ry, x1: s.cx + s.rx, y1: s.cy + s.ry };
  const xs = s.pts.map(([x]) => x);
  const ys = s.pts.map(([, y]) => y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// The same shape shrunk by `k` and nudged up-left: the lit part of a cel-
// shaded fill, leaving a shadow crescent along the bottom and right.
function inset(s, k) {
  if (s.kind === "ell") return ell(s.cx - k * 0.3, s.cy - k * 0.45, Math.max(0.3, s.rx - k), Math.max(0.3, s.ry - k));
  const b = bbox(s);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const sx = Math.max(0.2, 1 - (2 * k) / Math.max(1, b.x1 - b.x0));
  const sy = Math.max(0.2, 1 - (2 * k) / Math.max(1, b.y1 - b.y0));
  return { ...s, pts: s.pts.map(([x, y]) => [cx + (x - cx) * sx - k * 0.3, cy + (y - cy) * sy - k * 0.45]) };
}

// ---------------------------------------------------------------------------
// Drawing: each call returns shapes in draw order.
// ---------------------------------------------------------------------------

// A cel-shaded part: shadow, lit fill, a soft highlight, then the outline.
export function solid(s, tone, { line = true, shine = true } = {}) {
  const b = bbox(s);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const depth = Math.min(2.2, Math.max(0.6, Math.min(w, h) * 0.12));
  const out = [
    { d: D(s), fill: tone.d },
    { d: D(inset(s, depth)), fill: tone.b },
  ];
  if (shine && tone.l && w > 7 && h > 7) {
    out.push({ d: ellD(ell(b.x0 + w * 0.32, b.y0 + h * 0.24, w * 0.13, h * 0.08)), fill: tone.l, op: 0.85 });
  }
  if (line) out.push({ d: D(s), fill: "none", stroke: INK, sw: SW });
  return out;
}

// A flat fill (markings, cheeks, lenses), optionally outlined.
export const flat = (s, fill, { line = false, op } = {}) => [
  { d: D(s), fill, ...(op != null && { op }) },
  ...(line ? [{ d: D(s), fill: "none", stroke: INK, sw: SW }] : []),
];

// An open ink stroke (mouths, brows, strings, seams).
export const stroke = (d, { color = INK, sw = 1.3 } = {}) => [{ d, fill: "none", stroke: color, sw }];

// Big cartoon eyes: white, pupil and a glint; `look` nudges the pupils.
export function eyes({ y = 33, rx = 4.4, ry = 5.4, look = [0.8, 0.8] } = {}) {
  return [39, 57].flatMap((x) => [
    ...flat(ell(x, y, rx, ry), "#ffffff", { line: true }),
    ...flat(ell(x + look[0], y + look[1], rx * 0.58, ry * 0.62), INK),
    ...flat(ell(x + look[0] + 1.1, y + look[1] - 1.3, 1, 1.1), "#ffffff"),
  ]);
}

export const cheeks = (y = 42, fill = "#ff8fa8") => [30.5, 65.5].flatMap((x) => flat(ell(x, y, 3.2, 1.9), fill, { op: 0.55 }));

// ---------------------------------------------------------------------------
// The body frame every vector character is drawn on (and every vector
// wearable is drawn for):
//   head   ellipse centred (48, 34), 50 wide, top at y 12.5, chin at y 55.5
//   eyes   centred (39, 33) and (57, 33)
//   neck   y 55;  chest centre (48, 65)
//   hands  centred (27.5, 72) and (68.5, 72)
//   feet   bottom at y 92
// ---------------------------------------------------------------------------

const ARM_L = [[36.5, 57.5], [31.5, 61], [27.5, 67.5], [29.5, 70.5], [33.5, 66.5], [38, 63.5]];
export const FRAME = {
  head: ell(48, 34, 25, 21.5),
  body: pts([[38, 55.5], [58, 55.5], [63.5, 63], [63.5, 75], [57, 81.5], [39, 81.5], [32.5, 75], [32.5, 63]]),
  armL: pts(ARM_L),
  armR: pts(mirror(ARM_L)),
  handL: ell(27.5, 72, 5, 4.6),
  handR: ell(68.5, 72, 5, 4.6),
  legL: box(38.5, 74, 46, 87.5, 3),
  legR: box(50, 74, 57.5, 87.5, 3),
  footL: ell(41, 88.5, 7, 4),
  footR: ell(55, 88.5, 7, 4),
};

// Legs, feet, body, arms and hands, in draw order. `belly` (a tone) adds a
// lighter tummy patch; `extras.back` draws behind the body (tails).
export function bodyParts({ fur, hands = fur, feet = fur, legs = fur, belly = null, back = [] }) {
  return [
    ...back,
    ...solid(FRAME.legL, legs),
    ...solid(FRAME.legR, legs),
    ...solid(FRAME.footL, feet),
    ...solid(FRAME.footR, feet),
    ...solid(FRAME.body, fur),
    ...(belly ? solid(ell(48, 70, 9.5, 8.5), belly, { shine: false }) : []),
    ...solid(FRAME.armL, fur, { shine: false }),
    ...solid(FRAME.armR, fur, { shine: false }),
    ...solid(FRAME.handL, hands),
    ...solid(FRAME.handR, hands),
  ];
}

// ---------------------------------------------------------------------------
// Wearables: drawn on the frame above, so each piece fits every character.
// ---------------------------------------------------------------------------

// Bounds of a list of shapes (every number pair in M / L / C / Q / Z paths is
// a point), for cropping card icons.
export function boundsOf(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of list) {
    const n = s.d.match(/-?\d*\.?\d+/g).map(Number);
    const pad = s.stroke ? (s.sw ?? 1) / 2 : 0;
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i] - pad);
      x1 = Math.max(x1, n[i] + pad);
      y0 = Math.min(y0, n[i + 1] - pad);
      y1 = Math.max(y1, n[i + 1] + pad);
    }
  }
  return { x: r2(x0), y: r2(y0), w: r2(x1 - x0), h: r2(y1 - y0) };
}

// `y` lifts or drops the whole piece (placement, like the admin's x / y).
export function wearable({ front, back = null, y = 0 }) {
  return { front, back, icon: null, bounds: boundsOf([...(back ?? []), ...front]), ...(y && { y }) };
}

// ---------------------------------------------------------------------------
// Extra shape helpers (used by the Myths, Legends, Heroes and Brainrot packs).
// ---------------------------------------------------------------------------

// A straight-edged polygon: spikes and points stay sharp.
export const poly = (list) => ({ ...pts(list), straight: true });

// Points along an ellipse from angle a0 to a1 (degrees, 0 = right, 90 = down).
export function arc(cx, cy, rx, ry, a0, a1, n = 18) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

// A five-pointed star centred on (cx, cy), outer radius R.
export const star = (cx, cy, R, inner = 0.45) =>
  poly(Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * inner : R;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }));

// A thick outlined stroke: an ink line with a coloured line on top (snakes,
// tails, chains, staffs).
export const tube = (d, color, sw = 3) => [
  { d, fill: "none", stroke: INK, sw: sw + 1.8 },
  { d, fill: "none", stroke: color, sw },
];
