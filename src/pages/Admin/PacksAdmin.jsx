import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Save, Trash2 } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import { NumberInput, SaveError, Section, TextInput, Toggle } from "./fields";
import ImageUpload from "./ImageUpload";
import { applyPackRows, getPack, packBackdrop } from "../../data/packs";
import { callFunction } from "../../services/backend/client";

// Admin → Packs. A pack is the parent of its characters and wearables: they
// only show on the site while the pack is published, and unpublishing the
// pack unpublishes all of them. The lists come straight from the characters
// and wearables tables.

const listPacks = (session) => callFunction("admin", { action: "listPacks" }, session).then((r) => r.packs);
const savePack = (session, pack, publishItems = false) => callFunction("admin", { action: "savePack", pack, publishItems }, session);
const deletePack = (session, id) => callFunction("admin", { action: "deletePack", id }, session);

const fallback = (row) => {
  const built = getPack(row.id);
  return built.id === row.id ? built : null;
};

function PacksAdmin({ session, characters, wearables, onChange }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listPacks(session).then(
      (r) => {
        if (!active) return;
        applyPackRows(r);
        setRows(r);
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [session, version]);

  const reload = () => setVersion((v) => v + 1);
  const itemsOf = (id) => ({
    characters: characters.filter((c) => (c.pack ?? "wild") === id),
    wearables: wearables.filter((w) => (w.pack ?? "wild") === id),
  });

  const setPublished = async (row, published, publishItems = false) => {
    const { characters: chars, wearables: wears } = itemsOf(row.id);
    if (!published) {
      const live = chars.filter((c) => c.published).length + wears.filter((w) => w.published).length;
      if (!window.confirm(`Unpublish ${row.name}? It disappears from the site, and ${live} published character${live === 1 ? "" : "s"} and wearable${live === 1 ? "" : "s"} in it are unpublished too.`)) return;
    }
    setBusy(row.id);
    setNote(null);
    try {
      const r = await savePack(session, { ...row, published }, publishItems);
      const n = r.changed.characters + r.changed.wearables;
      setNote(
        published
          ? `${row.name} is published${n ? `, with ${r.changed.characters} characters and ${r.changed.wearables} wearables` : ""}.`
          : `${row.name} is unpublished${n ? `, along with ${r.changed.characters} characters and ${r.changed.wearables} wearables` : ""}.`,
      );
      reload();
      onChange();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <p className="admin-error">{error}</p>;
  if (!rows) return <p className="admin-hint">Loading packs…</p>;

  if (editing) {
    return (
      <PackEditor
        key={editing.id || "new"}
        initial={editing}
        isNew={!editing.saved}
        session={session}
        items={itemsOf(editing.id)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
          onChange();
        }}
      />
    );
  }

  return (
    <>
      <div className="admin-toolbar">
        <p className="admin-hint">Packs are the parent of characters and wearables. Unpublish a pack to take it and everything in it off the site.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => setEditing({ id: "", name: "", published: false, sort_order: rows.length, saved: false })}>
          <Plus size={17} /> New pack
        </button>
      </div>
      {note && <p className="admin-ok">{note}</p>}
      <ul className="admin-list">
        {rows.map((row) => {
          const { characters: chars, wearables: wears } = itemsOf(row.id);
          const lead = chars.find((c) => !c.art.locked) ?? chars[0];
          return (
            <li key={row.id} className={row.published ? "" : "is-off"}>
              <span className="admin-list-art admin-drop-thumb">
                <img src={packBackdrop({ ...(fallback(row) ?? {}), id: row.id, backdropUrl: row.backdrop_url })} alt="" />
              </span>
              <span className="admin-list-main">
                <strong>{row.name}</strong>
                <span className="admin-hint">
                  {chars.filter((c) => c.published).length}/{chars.length} characters published ·{" "}
                  {wears.filter((w) => w.published).length}/{wears.length} wearables published
                </span>
              </span>
              <span className="admin-list-meta">
                <span className={`admin-chip ${row.published ? "is-live" : ""}`}>{row.published ? "Published" : "Unpublished"}</span>
                {lead && <ItemArt art={lead.art} alt="" itemId={lead.id} size="sm" />}
              </span>
              <span className="admin-pack-actions">
                {row.published ? (
                  <button type="button" className="ghost-button" disabled={busy === row.id} onClick={() => setPublished(row, false)}>
                    <EyeOff size={15} /> Unpublish
                  </button>
                ) : (
                  <button type="button" className="ghost-button" disabled={busy === row.id} onClick={() => setPublished(row, true, true)}>
                    <Eye size={15} /> Publish all
                  </button>
                )}
                <button type="button" className="ghost-button" onClick={() => setEditing({ ...row, saved: true })}>
                  <Pencil size={15} /> Edit
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PackEditor({ initial, isNew, session, items, onClose, onSaved }) {
  const built = fallback(initial);
  const [draft, setDraft] = useState(initial);
  const [publishItems, setPublishItems] = useState(false);
  const [state, setState] = useState({ saving: false, error: null, errors: [] });
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    if (!draft.published && initial.published) {
      const live = items.characters.filter((c) => c.published).length + items.wearables.filter((w) => w.published).length;
      if (!window.confirm(`Unpublishing ${draft.name || "this pack"} also unpublishes ${live} characters and wearables in it. Continue?`)) return;
    }
    setState({ saving: true, error: null, errors: [] });
    try {
      const pack = { ...draft };
      delete pack.saved;
      await savePack(session, pack, draft.published && publishItems);
      onSaved();
    } catch (e) {
      setState({ saving: false, error: e.message ?? "Save failed.", errors: e.details ?? [] });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${draft.name}? This can’t be undone.`)) return;
    try {
      await deletePack(session, draft.id);
      onSaved();
    } catch (e) {
      setState({ saving: false, error: e.message, errors: [] });
    }
  };

  const placeholder = (key, sub) => (sub ? built?.wardrobe?.[sub] : built?.[key]) || "";

  return (
    <div className="admin-editor">
      <header className="admin-editor-head">
        <button type="button" className="ghost-button" onClick={onClose}>
          <ArrowLeft size={15} /> All packs
        </button>
        <h2>{isNew ? "New pack" : draft.name}</h2>
        <span className={`admin-chip ${draft.published ? "is-live" : ""}`}>{draft.published ? "Published" : "Unpublished"}</span>
      </header>

      <Section title="Publishing">
        <Toggle
          label="Published"
          checked={draft.published}
          onChange={(v) => set({ published: v })}
          hint="Off takes the pack, its characters, its wearables and its drop off the site, and unpublishes every character and wearable in it."
        />
        {draft.published && (
          <Toggle
            label="Also publish every character and wearable in it"
            checked={publishItems}
            onChange={setPublishItems}
            hint="Leave off to publish them one by one from the Characters and Wearables tabs."
          />
        )}
      </Section>

      <Section title="Details">
        <TextInput
          label="Id"
          value={draft.id}
          onChange={(v) => set({ id: v.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
          disabled={!isNew}
          hint={isNew ? "Lowercase, used in links. Can’t change later." : undefined}
          errors={state.errors}
          path="id"
        />
        <TextInput label="Name" value={draft.name} onChange={(v) => set({ name: v })} errors={state.errors} path="name" />
        <TextInput label="Tagline" value={draft.tagline} onChange={(v) => set({ tagline: v })} placeholder={placeholder("tagline")} wide />
        <TextInput label="Description" value={draft.description} onChange={(v) => set({ description: v })} placeholder={placeholder("description")} wide multiline />
        <TextInput label="Wardrobe tagline" value={draft.wardrobe_tagline} onChange={(v) => set({ wardrobe_tagline: v })} placeholder={placeholder(null, "tagline")} wide />
        <TextInput
          label="Wardrobe description"
          value={draft.wardrobe_description}
          onChange={(v) => set({ wardrobe_description: v })}
          placeholder={placeholder(null, "description")}
          wide
          multiline
        />
        <NumberInput label="Order" value={draft.sort_order} onChange={(v) => set({ sort_order: v ?? 0 })} step="1" hint="Lower comes first." />
        <p className="admin-note is-wide">Empty text uses the site’s built-in copy, shown greyed in each field.</p>
      </Section>

      <Section title="Backdrop">
        <ImageUpload
          label="Backdrop scene"
          hint="Wide scene behind the pack’s pages, carousel card and drop (PNG or WebP, at least 1600 px wide). Empty uses the built-in scene."
          value={draft.backdrop_url}
          folder={draft.id ? `packs/${draft.id}` : null}
          session={session}
          onUploaded={(url) => set({ backdrop_url: url })}
          onClear={() => set({ backdrop_url: null })}
        />
      </Section>

      {!isNew && (
        <Section title={`In this pack (${items.characters.length} characters, ${items.wearables.length} wearables)`}>
          <ul className="admin-sales is-wide">
            {[...items.characters, ...items.wearables].map((it) => (
              <li key={it.id}>
                <ItemArt art={it.art} alt="" itemId={it.id} item={it.art?.kind === "wearable" ? it : undefined} size="sm" />
                <span className="admin-pick-name">
                  <b>{it.name}</b>
                  <small>{it.art?.kind === "wearable" ? "Wearable" : "Character"}</small>
                </span>
                <span className={`admin-chip ${it.published ? "is-live" : ""}`}>{it.published ? "Published" : "Draft"}</span>
              </li>
            ))}
          </ul>
          <p className="admin-hint is-wide">Edit these in the Characters and Wearables tabs; this list reads from them.</p>
        </Section>
      )}

      <SaveError message={state.error} errors={state.errors} />
      <div className="admin-actions">
        <div className="admin-actions-row">
          <button type="button" className="primary-button" onClick={save} disabled={state.saving || !draft.id || !draft.name}>
            <Save size={16} /> {state.saving ? "Saving…" : "Save pack"}
          </button>
          {!isNew && items.characters.length + items.wearables.length === 0 && (
            <button type="button" className="ghost-button is-danger" onClick={remove}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PacksAdmin;
