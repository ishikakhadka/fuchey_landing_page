import { useId } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import { getPack, packs } from "../../data/packs";

// An ordered list of characters chosen from a dropdown. Only ids are kept;
// names and art come from the characters table, so edits there show up
// everywhere the list is used. `pool` limits the dropdown (e.g. one pack).
function CharacterPicker({ label, hint, value = [], onChange, characters, pool = characters, max = 60, emptyText }) {
  const id = useId();
  const chosen = value.map((v) => characters.find((c) => c.id === v)).filter(Boolean);
  const left = pool.filter((c) => !value.includes(c.id));
  const groups = packs
    .map((p) => ({ pack: p, items: left.filter((c) => getPack(c.pack).id === p.id) }))
    .filter((g) => g.items.length);

  const move = (i, dir) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div className="admin-field is-wide">
      <label htmlFor={id}>{label}</label>
      {chosen.length ? (
        <ol className="admin-pick-list">
          {chosen.map((c, i) => (
            <li key={c.id}>
              <span className="admin-pick-n">{i + 1}</span>
              <ItemArt art={c.art} alt="" itemId={c.id} size="sm" />
              <span className="admin-pick-name">
                <b>{c.name}</b>
                <small>
                  {getPack(c.pack).name}
                  {c.art.locked ? " · art not revealed" : ""}
                </small>
              </span>
              <button type="button" className="icon-button" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={15} />
              </button>
              <button type="button" className="icon-button" aria-label={`Move ${c.name} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={15} />
              </button>
              <button type="button" className="icon-button" aria-label={`Remove ${c.name}`} onClick={() => onChange(value.filter((v) => v !== c.id))}>
                <X size={15} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        emptyText && <p className="admin-note">{emptyText}</p>
      )}
      <select
        id={id}
        value=""
        disabled={!left.length || value.length >= max}
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
        <option value="">{left.length ? "Add a character…" : "Every character is added"}</option>
        {groups.map((g) => (
          <optgroup key={g.pack.id} label={g.pack.name}>
            {g.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.art.locked ? " (not revealed)" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {hint && <p className="admin-hint">{hint}</p>}
    </div>
  );
}

export default CharacterPicker;
