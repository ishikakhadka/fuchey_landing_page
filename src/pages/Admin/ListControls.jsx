import { useId } from "react";
import { Search } from "lucide-react";

import { ALL } from "./listView";

// Search, pack filter and A–Z / Z–A sort for any admin list: catalogue
// characters and wearables, the animator's characters and wardrobe, and the
// "Import from animator" pickers. Data-driven: the packs offered are the ones
// the list's own items belong to, never a fixed list.
//
//   const [view, setView] = useState(emptyView);              // from ./listView
//   const shown = applyListView(items, view, { name: (i) => i.name, pack: (i) => i.pack });
//   <ListControls view={view} onChange={setView} packs={packOptions(items, …)} />

const SORTS = [
  ["az", "Name A–Z"],
  ["za", "Name Z–A"],
];

// `sorts`: extra orderings to offer first, e.g. [["order", "Catalogue order"]].
function ListControls({ view, onChange, packs, placeholder = "Search by name", sorts = [], allPacks = "All packs", noun }) {
  const id = useId();
  const set = (patch) => onChange({ ...view, ...patch });
  return (
    <div className="list-controls" role="search">
      <label className="list-search" htmlFor={`${id}-q`}>
        <Search size={15} aria-hidden="true" />
        <input
          id={`${id}-q`}
          type="search"
          placeholder={placeholder}
          aria-label={placeholder}
          value={view.query}
          onChange={(e) => set({ query: e.target.value })}
        />
      </label>
      {packs && (
        <label className="list-select">
          <span>Pack</span>
          <select value={view.pack} onChange={(e) => set({ pack: e.target.value })}>
            <option value={ALL}>{allPacks}</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.count})
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="list-select">
        <span>Sort</span>
        <select value={view.sort} onChange={(e) => set({ sort: e.target.value })}>
          {[...sorts, ...SORTS].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {noun && <span className="list-count admin-hint">{noun}</span>}
    </div>
  );
}

export default ListControls;
