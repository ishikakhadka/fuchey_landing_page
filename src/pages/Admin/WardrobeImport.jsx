import { useEffect, useId, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";

import { adminStudioWearableList, adminStudioWearableVisual } from "../../services/backend/admin";
import { packs } from "../../data/packs";
import { Field, Section } from "./fields";
import { applyListView } from "./listView";
import { approvedWearableVersion, siteId } from "./studio";

// "Import from animator" in the Wearable editor: pick a pack, then one of its
// approved wardrobe items from the Fuchey Animator, and the form is filled
// from that item's approved version: slot, pack, the layered pictures and
// where they sit on every character it fits (built by the server with the
// same formula as the Animator → Wardrobe preview), and the compatible
// characters. Nothing is placed by hand. The wearable remembers the version
// (`studio`), and this panel offers an update when a newer one is approved;
// until then the live wearable keeps the version it has.
//
// One entry per wardrobe item, never per version: each item offers only its
// current approved version (studio_wearables.approved_version), so pending,
// rejected and superseded versions never show here.

function sitePackFor(w) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    packs.find((p) => p.id === siteId(w.pack_id)) ??
    packs.find((p) => p.id === `${siteId(w.pack_id)}s`) ??
    packs.find((p) => norm(p.name) === norm(w.pack_name)) ??
    null
  );
}

const approvedOf = approvedWearableVersion;
const SEARCH_PACKS_FROM = 7; // offer a pack search once the list gets long

function WardrobeImport({ session, draft, isNew, onApply }) {
  const uid = useId();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [packId, setPackId] = useState("");
  const [packQuery, setPackQuery] = useState("");
  const [key, setKey] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("az");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = draft.studio;
  const keyOf = (w) => `${w.pack_id}/${w.slot}/${w.item_id}`;

  // One request when the panel opens; searching and filtering happen here.
  useEffect(() => {
    let active = true;
    adminStudioWearableList(session).then(
      (r) => {
        if (!active) return;
        const approved = r.wearables.filter((w) => approvedOf(w));
        setList(approved);
        // Start on the wearable's own animator source when it has one.
        const start = ref ? approved.find((w) => w.pack_id === ref.pack && w.slot === ref.slot && w.item_id === ref.item) : null;
        if (start) {
          setPackId(start.pack_id);
          setKey(keyOf(start));
        }
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
    // Only on open: later edits to the draft shouldn't move the pickers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Packs that have at least one approved wardrobe item, by name.
  const packList = useMemo(() => {
    const m = new Map();
    for (const w of list ?? []) {
      const p = m.get(w.pack_id) ?? { id: w.pack_id, name: w.pack_name, count: 0 };
      p.count++;
      m.set(w.pack_id, p);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [list]);
  const packMatches = applyListView(packList, { query: packQuery, pack: "all", sort: "az" }, { pack: () => "all", also: (p) => [p.id] });
  // Keep the chosen pack listed even when the pack search no longer matches it.
  const packShown = packId && !packMatches.some((p) => p.id === packId) ? [packList.find((p) => p.id === packId), ...packMatches].filter(Boolean) : packMatches;

  const inPack = useMemo(() => (list ?? []).filter((w) => w.pack_id === packId), [list, packId]);
  const items = applyListView(inPack, { query, pack: "all", sort }, { pack: () => "all", also: (w) => [w.item_id, w.slot, w.group_label ?? "", w.variant_label ?? ""] });
  const chosen = inPack.find((w) => keyOf(w) === key) ?? null;

  const source = ref ? (list ?? []).find((w) => w.pack_id === ref.pack && w.slot === ref.slot && w.item_id === ref.item) : null;
  const newer = source && source.approved_version > ref.version ? approvedOf(source) : null;

  // A new pack: nothing from the previous one may stay selected.
  const pickPack = (id) => {
    setPackId(id);
    setKey("");
    setQuery("");
    setMessage(null);
    setError(null);
  };
  const pickItem = (k) => {
    setKey(k);
    setMessage(null);
    setError(null);
  };

  const fill = async (w, v) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const built = await adminStudioWearableVisual(session, v.id);
      const pack = sitePackFor(w);
      onApply({
        ...(isNew ? { id: siteId(`${w.pack_id}-${w.item_id}`) } : {}),
        name: w.name,
        type: built.visual.layer,
        ...(pack ? { pack: pack.id } : {}),
        visual: built.visual,
        compatibleCharacters: built.compatibleCharacters,
        ...(draft.imageUrl || !built.icon ? {} : { imageUrl: built.icon }),
        studio: built.studio,
        // A colour variant from the animator (pack.json "wardrobeGroups") joins its group on the site.
        ...(w.group_key
          ? {
              groupId: siteId(`${pack?.id ?? w.pack_id}-${w.group_key}`),
              groupName: w.group_label,
              variantLabel: w.variant_label,
              variantOrder: w.variant_default ? 0 : 10,
            }
          : {}),
      });
      setMessage(
        `Filled from ${w.name} version ${v.version}: placed on ${built.compatibleCharacters.join(", ")}.` +
          (built.unmatched.length ? ` Not on the website yet, so left out: ${built.unmatched.join(", ")}.` : "") +
          (pack ? "" : ` No marketplace pack matches “${w.pack_name}”: pick one under Basics.`) +
          " Check the preview, then save.",
      );
    } catch (e) {
      setError(e.message + (Array.isArray(e.details) && e.details.length ? ` (${e.details.join(", ")})` : ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Import from animator">
      {error && <p className="admin-error is-wide">{error}</p>}
      {!list && !error && <p className="admin-hint is-wide">Loading approved wardrobe items…</p>}
      {list && !list.length && (
        <p className="admin-hint is-wide">No approved animator wardrobe items yet. Approve one under Admin → Animator → Wardrobe first.</p>
      )}
      {ref && (
        <div className="studio-source is-wide">
          <span className="admin-chip is-ok">
            From animator: {ref.pack}/{ref.slot}_{ref.item} · version {ref.version}
          </span>
          {newer && (
            <button type="button" className="ghost-button" disabled={busy} onClick={() => fill(source, newer)}>
              <RefreshCw size={15} /> Version {newer.version} is approved: update pictures and placement
            </button>
          )}
        </div>
      )}
      {list?.length > 0 && (
        <>
          {/* Step 1: the pack */}
          <Field label="1. Pack" hint={`${packList.length} pack${packList.length === 1 ? "" : "s"} with approved wardrobe items.`}>
            {(id) => (
              <div className="import-step">
                {packList.length >= SEARCH_PACKS_FROM && (
                  <label className="list-search" htmlFor={`${uid}-pq`}>
                    <Search size={15} aria-hidden="true" />
                    <input id={`${uid}-pq`} type="search" placeholder="Find a pack" aria-label="Find a pack" value={packQuery} onChange={(e) => setPackQuery(e.target.value)} />
                  </label>
                )}
                <select id={id} value={packId} onChange={(e) => pickPack(e.target.value)}>
                  <option value="">{packShown.length ? "Choose a pack…" : "No packs match"}</option>
                  {packShown.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.count})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Field>

          {/* Step 2: a wardrobe item in that pack */}
          <Field label="2. Wardrobe item" hint={packId ? `Only ${packList.find((p) => p.id === packId)?.name ?? packId} items, each at its approved version.` : "Choose a pack first."}>
            {(id) => (
              <div className="import-step">
                <div className="import-step-row">
                  <label className="list-search" htmlFor={`${uid}-q`}>
                    <Search size={15} aria-hidden="true" />
                    <input
                      id={`${uid}-q`}
                      type="search"
                      placeholder="Search this pack"
                      aria-label="Search wardrobe items in this pack"
                      value={query}
                      disabled={!packId}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select aria-label="Sort wardrobe items" value={sort} disabled={!packId} onChange={(e) => setSort(e.target.value)}>
                    <option value="az">A–Z</option>
                    <option value="za">Z–A</option>
                  </select>
                </div>
                <select id={id} value={chosen ? key : ""} disabled={!packId || !items.length} onChange={(e) => pickItem(e.target.value)}>
                  <option value="">
                    {!packId ? "Choose a pack first" : !inPack.length ? "No wardrobes found in this pack" : !items.length ? "No wardrobes match your search" : "Choose a wardrobe item…"}
                  </option>
                  {/* single items, then each colour group's variants together under its label */}
                  {items.filter((w) => !w.group_key).map((w) => (
                    <option key={w.id} value={keyOf(w)}>
                      {w.name} · version {w.approved_version}
                    </option>
                  ))}
                  {[...new Set(items.filter((w) => w.group_key).map((w) => w.group_key))].map((gk) => {
                    const members = items.filter((w) => w.group_key === gk);
                    return (
                      <optgroup key={gk} label={`${members[0].group_label} (${members.length} variant${members.length === 1 ? "" : "s"})`}>
                        {members.map((w) => (
                          <option key={w.id} value={keyOf(w)}>
                            {w.variant_label}{w.variant_default ? " (default)" : ""} · version {w.approved_version}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
          </Field>
          {chosen && (
            <div className="is-wide">
              <button type="button" className="primary-button" disabled={busy} onClick={() => fill(chosen, approvedOf(chosen))}>
                <Download size={15} /> {busy ? "Filling…" : `Fill from ${chosen.name} (version ${chosen.approved_version})`}
              </button>
            </div>
          )}
        </>
      )}
      {message && <p className="admin-ok is-wide">{message}</p>}
    </Section>
  );
}

export default WardrobeImport;
