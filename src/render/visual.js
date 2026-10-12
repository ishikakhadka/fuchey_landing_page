import { SLOT_ORDER } from "../data/taxonomy";

// View box for a character render: the 96×96 base art plus headroom for
// hats and halos. Shared with overlays drawn on top of a render.
export const CHARACTER_VIEW = "-14 -19 116 116";

// How a wearable is drawn on a character. Comes from the catalogue
// (wearables.visual), always in the base art's 96×96 grid coordinates:
//
//   kind "runs"   pixel art as horizontal runs [{ x, y, w, c }]:
//                 front (over the character), back (behind it), icon (card art);
//                 optional x / y shift the whole layer; `res` = pixels per
//                 grid unit when the runs are drawn finer than the grid
//   kind "vector" smooth vector art as shapes [{ d, fill, stroke, sw, op }]
//                 (SVG path data): front, back, icon as for runs, plus
//                 `bounds` { x, y, w, h }; optional x / y shift
//   kind "image"  an uploaded transparent PNG: image (front), backImage,
//                 width × height source pixels, placed at x, y and scaled by
//                 `scale` grid units per source pixel
//
//   layer  which wardrobe layer it stacks in (default: the wearable's type)
//   z      fine order within that layer
//   perCharacter  { [characterId]: overrides } — e.g. a different y on a
//                 character with a taller head

// The visual for one character, with that character's overrides applied.
export function resolveVisual(wearable, characterId) {
  const visual = wearable?.visual;
  if (!visual) return null;
  const override = characterId ? visual.perCharacter?.[characterId] : null;
  return override ? { ...visual, ...override } : visual;
}

export function layerRank(wearable, visual) {
  const slot = SLOT_ORDER.indexOf(visual.layer ?? wearable.type);
  return (slot < 0 ? SLOT_ORDER.length : slot) * 1000 + (visual.z ?? 0);
}

// Equipped wearables → [{ wearable, visual }] in back-to-front order.
export function stackLayers(equipped, characterId) {
  return equipped
    .map((wearable) => ({ wearable, visual: resolveVisual(wearable, characterId) }))
    .filter((l) => l.visual)
    .map((l, i) => ({ ...l, rank: layerRank(l.wearable, l.visual), i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i);
}

// A sprite ({ palette, rows }) as horizontal runs of one palette key →
// [{ x, y, w, key }], so it draws with few rects.
export function spriteRuns(sprite) {
  const out = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== ".") out.push({ x, y, w: end - x, key });
      x = end;
    }
  });
  return out;
}

// Grid-space box covered by a visual (used to crop card icons).
export function visualBounds(visual) {
  if (visual.kind === "image") {
    const s = visual.scale ?? 1;
    return { x: visual.x ?? 0, y: visual.y ?? 0, w: (visual.width ?? 96) * s, h: (visual.height ?? 96) * s };
  }
  const r = visual.res ?? 1;
  const b = visual.bounds ?? { x: 0, y: 0, w: 96 * r, h: 96 * r };
  return { x: b.x / r + (visual.x ?? 0), y: b.y / r + (visual.y ?? 0), w: b.w / r, h: b.h / r };
}
