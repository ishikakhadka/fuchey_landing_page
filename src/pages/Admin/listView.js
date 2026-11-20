// Search, pack filter and A–Z / Z–A sort for admin lists (see ListControls.jsx).
// Data-driven: packs come from the items themselves, never a fixed list.

export const ALL = "all";

export const emptyView = { query: "", pack: ALL, sort: "az" };

const fold = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Items whose name matches the search and whose pack matches the filter, sorted by name.
export function applyListView(items, view, { name = (i) => i.name, pack = (i) => i.pack, also = () => [] } = {}) {
  const words = fold(view.query).split(/\s+/).filter(Boolean);
  const out = items.filter((i) => {
    if (view.pack !== ALL && pack(i) !== view.pack) return false;
    if (!words.length) return true;
    const hay = fold([name(i), ...also(i)].join(" "));
    return words.every((w) => hay.includes(w));
  });
  if (view.sort === "az" || view.sort === "za") {
    const dir = view.sort === "za" ? -1 : 1;
    out.sort((a, b) => dir * fold(name(a)).localeCompare(fold(name(b)), undefined, { numeric: true }));
  }
  return out;
}

// [{ id, name, count }] for every pack the items use, by name.
export function packOptions(items, { pack = (i) => i.pack, label = (id) => id } = {}) {
  const counts = new Map();
  for (const i of items) counts.set(pack(i), (counts.get(pack(i)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: label(id), count }))
    .sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
}
