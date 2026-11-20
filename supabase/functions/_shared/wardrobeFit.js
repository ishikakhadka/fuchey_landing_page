// Animator wardrobe → website placement. Plain JavaScript with no imports so
// the edge functions (Deno), the tests (node --test) and anything else can use
// the very same formula.
//
// Animator: every part is a full-canvas PNG (W × H canvas pixels, top-left
// origin, whole pixels), moved per character by `offsets[part] = [ox, oy]`.
// A published fit is cropped to the box (bx, by, bw, bh) its front and back
// layers cover, and exported at `s` output pixels per canvas pixel.
//
// Website: a character imported from the animator draws its still preview as
// <image x=0 y=0 width=96 height=96> with the default xMidYMid meet, so the
// canvas is scaled by k = 96 / max(W, H) and centred. A wearable image is
// placed by its top-left (x, y) in grid units and drawn at width × height
// source pixels times `scale` grid units per source pixel. So:
//
//   x = x0 + (bx + ox)·k    y = y0 + (by + oy)·k    width = bw·s    height = bh·s    scale = k / s
//   with x0 = (96 − W·k) / 2, y0 = (96 − H·k) / 2
//
// Neither side uses rotation, a non top-left anchor or uneven scale today, so
// a fit that asks for one is refused here rather than drawn wrong.

export const GRID = 96;

export const ANIMATOR_SLOTS = ["back", "outfit", "neck", "headwrap", "face", "hat", "front", "special"];

// Animator slot → website wardrobe slot (public.wearable_slot), and a z that
// keeps the animator's order inside a shared website layer (face over neck).
export const SITE_SLOT = {
  back: "backpack",
  outfit: "outfit",
  neck: "accessory",
  headwrap: "headwear",
  face: "accessory",
  hat: "hat",
  front: "held",
  special: "special",
};
export const SITE_Z = { neck: 0, face: 10 };

// Head-group slots move with the head in animations (nods, slumps).
export const HEAD_SLOTS = ["headwrap", "face", "hat"];

const round = (v, places = 4) => Math.round(v * 10 ** places) / 10 ** places;

// One fit's placement on the website grid.
//   canvas [W, H] · offset [ox, oy] · box { x, y, w, h } (canvas px) · scale s (export)
export function siteFit({ canvas, offset = [0, 0], box }, s) {
  const [W, H] = canvas;
  const k = GRID / Math.max(W, H);
  const x0 = (GRID - W * k) / 2;
  const y0 = (GRID - H * k) / 2;
  return {
    x: round(x0 + (box.x + offset[0]) * k),
    y: round(y0 + (box.y + offset[1]) * k),
    width: box.w * s,
    height: box.h * s,
    scale: round(k / s, 8),
  };
}

const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;

// Checks one fit sent by the animator → { fit } or { problems }.
export function checkFit(f, i, slot) {
  const p = [];
  const at = `fits[${i}]`;
  if (!isObj(f)) return { problems: [`${at}: not an object`] };
  if (typeof f.character !== "string" || !ID.test(f.character)) p.push(`${at}.character: needs the animator character id`);
  const canvas = Array.isArray(f.canvas) && f.canvas.length === 2 && f.canvas.every((v) => int(v, 1, 4096)) ? f.canvas : null;
  if (!canvas) p.push(`${at}.canvas: [width, height] in pixels`);
  const offset = f.offset == null ? [0, 0] : Array.isArray(f.offset) && f.offset.length === 2 && f.offset.every((v) => int(v, -4096, 4096)) ? f.offset : null;
  if (!offset) p.push(`${at}.offset: [x, y] whole pixels`);
  const b = f.box;
  const box = isObj(b) && int(b.x, 0, 4096) && int(b.y, 0, 4096) && int(b.w, 1, 4096) && int(b.h, 1, 4096) ? { x: b.x, y: b.y, w: b.w, h: b.h } : null;
  if (!box) p.push(`${at}.box: { x, y, w, h } in canvas pixels`);
  else if (canvas && (box.x + box.w > canvas[0] || box.y + box.h > canvas[1])) p.push(`${at}.box: outside the ${canvas[0]}×${canvas[1]} canvas`);
  if ((f.rotation ?? 0) !== 0) p.push(`${at}.rotation: the website can't rotate wearables yet`);
  if ((f.scaleX ?? 1) !== 1 || (f.scaleY ?? 1) !== 1) p.push(`${at}.scaleX/scaleY: wearables are drawn at their own size`);
  const anchor = f.anchor ?? [0, 0];
  if (!Array.isArray(anchor) || anchor[0] !== 0 || anchor[1] !== 0) p.push(`${at}.anchor: only the top-left anchor [0, 0] is supported`);
  const unit = f.unit ?? 1;
  if (!int(unit, 1, 8)) p.push(`${at}.unit: 1–8`);
  const arms = f.arms ?? "front";
  if (arms !== "front" && arms !== "behind_head") p.push(`${at}.arms: front or behind_head`);
  const order = f.layer?.order ?? 0;
  if (!int(order, 0, 999)) p.push(`${at}.layer.order: 0–999`);
  if (p.length) return { problems: p };
  return {
    fit: {
      character: f.character,
      canvas,
      unit,
      arms,
      placement: {
        offset,
        box,
        group: HEAD_SLOTS.includes(slot) ? "head" : "body",
        rotation: 0,
        anchor: [0, 0],
        scaleX: 1,
        scaleY: 1,
        layer: { slot, order, siteLayer: SITE_SLOT[slot], z: SITE_Z[slot] ?? 0 },
      },
      animation: isObj(f.animation) ? f.animation : {},
    },
  };
}

// The website `visual` for an approved version.
//   slot        animator slot
//   fits        [{ character, canvas_w, canvas_h, placement, site, files: { front?, back? } (public URLs) }]
//   siteIdOf    animator character id → website character id (or null when it has no site character)
// → { visual, compatibleCharacters, unmatched: [animator ids without a site character] }
export function buildVisual(slot, fits, siteIdOf) {
  const layer = SITE_SLOT[slot];
  const z = SITE_Z[slot] ?? 0;
  const entries = [];
  const unmatched = [];
  for (const f of fits) {
    const id = siteIdOf(f.character_id ?? f.character);
    if (!id) {
      unmatched.push(f.character_id ?? f.character);
      continue;
    }
    if (!f.files?.front && !f.files?.back) continue;
    entries.push([
      id,
      {
        image: f.files.front ?? null,
        ...(f.files.back ? { backImage: f.files.back } : {}),
        x: f.site.x,
        y: f.site.y,
        width: f.site.width,
        height: f.site.height,
        scale: f.site.scale,
      },
    ]);
  }
  if (!entries.length) return { visual: null, compatibleCharacters: [], unmatched };
  const [[, base], ...rest] = entries;
  const perCharacter = {};
  for (const [id, e] of rest) {
    const o = {};
    for (const k of ["image", "backImage", "x", "y", "width", "height", "scale"]) if (e[k] !== base[k]) o[k] = e[k];
    // A fit without a back layer must not inherit the base's.
    if (base.backImage && !e.backImage) o.backImage = null;
    if (Object.keys(o).length) perCharacter[id] = o;
  }
  return {
    visual: { kind: "image", layer, z, ...base, ...(Object.keys(perCharacter).length ? { perCharacter } : {}) },
    compatibleCharacters: entries.map(([id]) => id),
    unmatched,
  };
}
