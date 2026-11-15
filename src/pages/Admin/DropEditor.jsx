import { useState } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import { Field, NumberInput, SaveError, Section, Select, TextInput, Toggle } from "./fields";
import ImageUpload from "./ImageUpload";
import { packs, getPack } from "../../data/packs";
import { adminDeleteDrop, adminSaveDrop } from "../../services/backend/content";
import { backdropFor, dropTiming } from "../../utils/drops";

// datetime-local works in the admin's local time; the database stores UTC.
const toLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v) => (v ? new Date(v).toISOString() : null);

// Create or edit one pack drop: what the banner and hero slide say, the
// scene behind them, which characters are sealed in the capsule, when it
// runs, where it shows and whether it's live at all.
function DropEditor({ initial, characters, session, onSaved, onDeleted, onClose }) {
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState({ saving: false, error: null, errors: [], ok: null });
  const isNew = !initial.saved;
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const packChars = characters.filter((c) => getPack(c.pack).id === draft.pack);
  const toggleChar = (id) =>
    set({ characterIds: draft.characterIds.includes(id) ? draft.characterIds.filter((x) => x !== id) : [...draft.characterIds, id] });
  const move = (id, dir) => {
    const list = [...draft.characterIds];
    const i = list.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set({ characterIds: list });
  };

  const save = async () => {
    setState({ saving: true, error: null, errors: [], ok: null });
    try {
      const saved = await adminSaveDrop(session, draft);
      setDraft({ ...saved, saved: true });
      setState({ saving: false, error: null, errors: [], ok: saved.live ? "Saved. It’s live on the site." : "Saved as a draft (not live)." });
      onSaved({ ...saved, saved: true });
    } catch (error) {
      setState({ saving: false, error: error.message ?? "Save failed.", errors: error.details ?? [], ok: null });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the drop “${draft.title}”? Its hero slide goes with it.`)) return;
    try {
      await adminDeleteDrop(session, draft.id);
      onDeleted(draft.id);
    } catch (error) {
      setState({ saving: false, error: error.message ?? "Delete failed.", errors: [], ok: null });
    }
  };

  const timing = dropTiming(draft);
  const crew = draft.characterIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean);

  return (
    <div className="admin-editor">
      <div className="admin-editor-head">
        <button type="button" className="back-link" onClick={onClose}>
          <ArrowLeft size={16} /> All drops
        </button>
        <h2>{isNew ? "New drop" : draft.title || draft.id}</h2>
        <span className={`admin-chip ${draft.live ? "is-live" : ""}`}>{draft.live ? "Live" : "Off"}</span>
      </div>

      <div className="admin-editor-body">
        <div className="admin-form">
          <Section title="Live">
            <Toggle
              label="Live on the site"
              checked={draft.live}
              onChange={(v) => set({ live: v })}
              hint="Master switch. Off hides this drop everywhere, whatever its dates."
            />
            <Toggle label="Show in the home hero" checked={draft.showInHero} onChange={(v) => set({ showInHero: v })} hint="Needs a drop slide in the Home tab (added for you when you create the drop)." />
            <Toggle label="Show in Upcoming Drops" checked={draft.showInUpcoming} onChange={(v) => set({ showInUpcoming: v })} />
            <Toggle label="Show the drop banner" checked={draft.showBanner} onChange={(v) => set({ showBanner: v })} hint="The wide banner on the Characters and Marketplace pages." />
          </Section>

          <Section title="Basics">
            <TextInput
              label="Id"
              value={draft.id}
              onChange={(v) => set({ id: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              disabled={!isNew}
              hint={isNew ? "Lowercase, used in links and uploads. Can’t change later." : undefined}
              errors={state.errors}
              path="id"
            />
            <Select label="Pack" value={draft.pack} onChange={(v) => set({ pack: v, characterIds: [] })} options={packs.map((p) => ({ id: p.id, label: p.name }))} errors={state.errors} path="pack" />
            <TextInput label="Banner title" value={draft.title} onChange={(v) => set({ title: v })} placeholder="Pirate Pack Drop" errors={state.errors} path="title" />
            <TextInput label="Label" value={draft.label} onChange={(v) => set({ label: v })} placeholder="Limited Time" hint="Small tag on the banner and hero." errors={state.errors} path="label" />
            <TextInput label="Hero headline" value={draft.headline} onChange={(v) => set({ headline: v })} placeholder="Something’s on" errors={state.errors} path="headline" />
            <TextInput label="Headline, orange line" value={draft.headlineAccent} onChange={(v) => set({ headlineAccent: v })} placeholder="the horizon." errors={state.errors} path="headline_accent" />
            <TextInput label="Tagline" value={draft.tagline} onChange={(v) => set({ tagline: v })} wide errors={state.errors} path="tagline" />
            <TextInput label="Description" value={draft.description} onChange={(v) => set({ description: v })} wide multiline errors={state.errors} path="description" />
          </Section>

          <Section title="When">
            <Field label="Starts" hint="Leave empty to show “Coming soon”." errors={state.errors} path="starts_at">
              {(id) => <input id={id} type="datetime-local" value={toLocal(draft.startsAt)} onChange={(e) => set({ startsAt: fromLocal(e.target.value) })} />}
            </Field>
            <Field label="Ends" hint="After this the drop hides itself." errors={state.errors} path="ends_at">
              {(id) => <input id={id} type="datetime-local" value={toLocal(draft.endsAt)} onChange={(e) => set({ endsAt: fromLocal(e.target.value) })} />}
            </Field>
            <p className="admin-note is-wide">
              Right now this would show: <strong>{timing.text}</strong>. Dates only change what the site shows; the sale itself
              opens from the on-chain listing.
            </p>
          </Section>

          <Section title="Characters in the capsule">
            {packChars.length ? (
              <div className="admin-field is-wide">
                <div className="admin-crew-pick">
                  {packChars.map((c) => (
                    <button key={c.id} type="button" className={`admin-crew ${draft.characterIds.includes(c.id) ? "is-on" : ""}`} onClick={() => toggleChar(c.id)} aria-pressed={draft.characterIds.includes(c.id)}>
                      <ItemArt art={c.art} alt="" itemId={c.id} size="sm" />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
                {draft.characterIds.length > 1 && (
                  <ol className="admin-crew-order">
                    {draft.characterIds.map((id, i) => (
                      <li key={id}>
                        {characters.find((c) => c.id === id)?.name ?? id}
                        <button type="button" className="icon-button" aria-label="Move left" onClick={() => move(id, -1)} disabled={i === 0}>←</button>
                        <button type="button" className="icon-button" aria-label="Move right" onClick={() => move(id, 1)} disabled={i === draft.characterIds.length - 1}>→</button>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="admin-hint">The middle one stands in front. Up to 6.</p>
              </div>
            ) : (
              <p className="admin-note is-wide">This pack has no characters yet.</p>
            )}
          </Section>

          <Section title="Look and button">
            <ImageUpload
              label="Backdrop scene"
              hint="Wide scene behind the banner and hero (PNG or WebP, at least 1600 px wide). Empty uses the pack’s built-in scene."
              value={draft.backdropUrl}
              folder={draft.id ? `drops/${draft.id}` : null}
              session={session}
              onUploaded={(url) => set({ backdropUrl: url })}
              onClear={() => set({ backdropUrl: null })}
            />
            <TextInput label="Button label" value={draft.ctaLabel} onChange={(v) => set({ ctaLabel: v })} placeholder="Get Drop Alerts" errors={state.errors} path="cta_label" />
            <TextInput label="Button link" value={draft.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="#waitlist or /marketplace" errors={state.errors} path="cta_href" />
            <NumberInput label="Order" value={draft.sortOrder} onChange={(v) => set({ sortOrder: v ?? 0 })} step="1" hint="Lower comes first in Upcoming Drops." />
          </Section>

          <SaveError message={state.error} errors={state.errors} />
          {state.ok && <p className="admin-ok">{state.ok}</p>}
          <div className="admin-actions">
            <button type="button" className="primary-button" onClick={save} disabled={state.saving}>
              <Save size={16} /> {state.saving ? "Saving…" : "Save drop"}
            </button>
            {!isNew && (
              <button type="button" className="ghost-button" onClick={remove}>
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>

        <aside className="admin-preview admin-drop-preview">
          <span className="admin-label">Banner preview</span>
          <div className="admin-banner">
            <img src={backdropFor(draft)} alt="" />
            <span className="admin-banner-shade" />
            {crew[0] && (
              <span className="admin-banner-art">
                <ItemArt art={crew[Math.floor((crew.length - 1) / 2)].art} alt="" itemId={crew[Math.floor((crew.length - 1) / 2)].id} size="sm" />
              </span>
            )}
            <span className="admin-banner-text">
              <b>{draft.label || "Coming Soon"}</b>
              <span>{draft.title || "Title"}</span>
            </span>
            <span className="admin-banner-time">{timing.text}</span>
          </div>
          <p className="admin-hint">The hero slide uses the same scene, headline and capsule.</p>
        </aside>
      </div>
    </div>
  );
}

export default DropEditor;
