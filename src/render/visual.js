import { SLOT_ORDER } from "../data/taxonomy";

// View box for a character render: the 96×96 base art plus headroom for
// hats and halos. Shared with overlays drawn on top of a render.
export const CHARACTER_VIEW = "-14 -19 116 116";

// How a wearable is drawn on a character. Comes from the catalogue
// (wearables.visual), always in the base art's 96×96 grid coordinates:
//
//   kind "runs"   pixel art as horizontal runs [{ x, y, w, c }]:
//                 front (over the character), back (behind it), icon (card art);
//                 optional x / y shift the whole layer
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

// Grid-space box covered by a visual (used to crop card icons).
export function visualBounds(visual) {
  if (visual.kind === "image") {
    const s = visual.scale ?? 1;
    return { x: visual.x ?? 0, y: visual.y ?? 0, w: (visual.width ?? 96) * s, h: (visual.height ?? 96) * s };
  }
  const b = visual.bounds ?? { x: 0, y: 0, w: 96, h: 96 };
  return { ...b, x: b.x + (visual.x ?? 0), y: b.y + (visual.y ?? 0) };
}
