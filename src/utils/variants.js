// Colour variants in the wardrobe: wearables that belong to one group (a
// Bandana in Red, Blue, Black…) show as one card with a colour picker. Each
// variant is still its own wearable (art, placement, compatible characters,
// listing), so equipping, loadouts and per-character art are unchanged; only
// the rack folds them together. Wearables in no group stay single cards.

const byVariant = (a, b) =>
  (a.variantOrder ?? 0) - (b.variantOrder ?? 0) || String(a.variantLabel ?? a.name).localeCompare(String(b.variantLabel ?? b.name));

// [wearable] → [{ key, group: { id, name } | null, variants: [wearable] }], in the
// order the first member of each card appears in the list.
export function groupVariants(list) {
  const out = [];
  const at = new Map();
  for (const w of list) {
    if (!w.groupId || !w.group) {
      out.push({ key: w.id, group: null, variants: [w] });
      continue;
    }
    if (!at.has(w.groupId)) {
      at.set(w.groupId, out.length);
      out.push({ key: `group:${w.groupId}`, group: w.group, variants: [] });
    }
    out[at.get(w.groupId)].variants.push(w);
  }
  for (const card of out) card.variants.sort(byVariant);
  return out;
}

// Which variant a card shows: the one worn, else the one last picked, else the
// first that fits the character, else the first.
export function shownVariant(card, { wornId, pickedId, fits = () => true } = {}) {
  const v = card.variants;
  return v.find((w) => w.id === wornId) ?? v.find((w) => w.id === pickedId) ?? v.find((w) => fits(w)) ?? v[0];
}
