import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Snowflake, Sparkles, Trash2 } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import { NumberInput, SaveError, Section, Select, TextInput, Toggle } from "./fields";
import ImageUpload from "./ImageUpload";
import DropEditor from "./DropEditor";
import CharacterPicker from "./CharacterPicker";
import { getPack, packs } from "../../data/packs";
import {
  HOME_SECTIONS,
  adminDeleteSlide,
  adminListContent,
  adminOrderSlides,
  adminSaveHomeSettings,
  adminSaveSlide,
} from "../../services/backend/content";
import { backdropFor, dropTiming } from "../../utils/drops";

const newDrop = (sortOrder) => ({
  id: "",
  pack: "pirates",
  title: "",
  label: "Coming Soon",
  headline: "",
  headlineAccent: "",
  tagline: "",
  description: "",
  backdropUrl: null,
  characterIds: [],
  startsAt: null,
  endsAt: null,
  live: false,
  showInHero: true,
  showInUpcoming: true,
  showBanner: true,
  ctaLabel: "",
  ctaHref: "",
  sortOrder,
});

// Shared loader for the Drops and Home tabs.
function useContentAdmin(session, onChange) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = () =>
    adminListContent(session).then(
      (d) => {
        setData(d);
        setError(null);
      },
      (e) => setError(e.message ?? "Couldn’t load the home content."),
    );
  useEffect(() => {
    let active = true;
    adminListContent(session).then(
      (d) => active && setData(d),
      (e) => active && setError(e.message ?? "Couldn’t load the home content."),
    );
    return () => {
      active = false;
    };
  }, [session]);
  return { data, setData, error, reload: () => reload().then(onChange) };
}

// ---------------------------------------------------------------------------
// Drops tab
// ---------------------------------------------------------------------------

export function DropsAdmin({ session, characters, onChange }) {
  const { data, error, reload } = useContentAdmin(session, onChange);
  const [editing, setEditing] = useState(null);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-hint">Loading drops…</p>;

  if (editing) {
    return (
      <DropEditor
        key={editing.id || "new"}
        initial={editing}
        characters={characters}
        session={session}
        onSaved={async (drop) => {
          // A new drop gets its own hero slide so it can appear in the carousel.
          if (!data.slides.some((s) => s.kind === "drop" && s.dropId === drop.id)) {
            await adminSaveSlide(session, {
              id: drop.id,
              kind: "drop",
              dropId: drop.id,
              enabled: true,
              sortOrder: data.slides.length,
              eyebrow: "", title: "", titleAccent: "", body: "", imageUrl: null, ctaLabel: "", ctaHref: "",
            }).catch(() => {});
          }
          await reload();
        }}
        onDeleted={async () => {
          setEditing(null);
          await reload();
        }}
        onClose={() => setEditing(null)}
      />
    );
  }

  const next = Math.max(0, ...data.drops.map((d) => d.sortOrder)) + 1;
  return (
    <>
      <div className="admin-toolbar is-sub">
        <p className="admin-hint">Each drop drives its banner, its hero slide and its card in Upcoming Drops.</p>
        <button type="button" className="primary-button" onClick={() => setEditing(newDrop(next))}>
          <Plus size={17} /> New drop
        </button>
      </div>
      {data.drops.length === 0 ? (
        <p className="admin-note">No drops yet.</p>
      ) : (
        <ul className="admin-list">
          {data.drops.map((d) => (
            <li key={d.id}>
              <span className="admin-list-art admin-drop-thumb">
                <img src={backdropFor(d)} alt="" />
              </span>
              <span className="admin-list-main">
                <strong>{d.title}</strong>
                <span className="admin-hint">
                  {getPack(d.pack).name} · {d.characterIds.length} in capsule · {dropTiming(d).text}
                </span>
              </span>
              <span className="admin-list-meta">
                <span className={`admin-chip ${d.live ? "is-live" : ""}`}>{d.live ? "Live" : "Off"}</span>
                <span className="admin-hint">
                  {[d.showInHero && "Hero", d.showInUpcoming && "Upcoming", d.showBanner && "Banner"].filter(Boolean).join(" · ") || "Hidden"}
                </span>
              </span>
              <button type="button" className="ghost-button" onClick={() => setEditing({ ...d, saved: true })}>
                <Pencil size={15} /> Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Home tab: hero slides (order, on/off, copy) and home settings
// ---------------------------------------------------------------------------

const KIND_LABEL = { drop: "Drop slide", scratch: "Scratch card", custom: "Custom slide" };

function SlideEditor({ slide, session, onSaved, onCancel }) {
  const [draft, setDraft] = useState(slide);
  const [state, setState] = useState({ saving: false, error: null, errors: [] });
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const isNew = !slide.saved;

  const save = async () => {
    setState({ saving: true, error: null, errors: [] });
    try {
      await adminSaveSlide(session, draft);
      onSaved();
    } catch (error) {
      setState({ saving: false, error: error.message ?? "Save failed.", errors: error.details ?? [] });
    }
  };

  return (
    <div className="admin-slide-editor">
      <Section title={draft.kind === "scratch" ? "Scratch card copy (empty = the default copy)" : "Custom slide"}>
        {isNew && (
          <TextInput
            label="Id"
            value={draft.id}
            onChange={(v) => set({ id: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
            errors={state.errors}
            path="id"
          />
        )}
        <TextInput label="Eyebrow" value={draft.eyebrow} onChange={(v) => set({ eyebrow: v })} errors={state.errors} path="eyebrow" />
        <TextInput label="Headline" value={draft.title} onChange={(v) => set({ title: v })} errors={state.errors} path="title" />
        <TextInput label="Headline, orange line" value={draft.titleAccent} onChange={(v) => set({ titleAccent: v })} errors={state.errors} path="title_accent" />
        <TextInput label="Body" value={draft.body} onChange={(v) => set({ body: v })} wide multiline errors={state.errors} path="body" />
        <TextInput label="Button label" value={draft.ctaLabel} onChange={(v) => set({ ctaLabel: v })} errors={state.errors} path="cta_label" />
        <TextInput label="Button link" value={draft.ctaHref} onChange={(v) => set({ ctaHref: v })} placeholder="/marketplace or #waitlist" errors={state.errors} path="cta_href" />
        {draft.kind === "custom" && (
          <ImageUpload
            label="Image"
            hint="Shown on the right of the slide (PNG or WebP)."
            value={draft.imageUrl}
            folder={draft.id ? `slides/${draft.id}` : null}
            session={session}
            onUploaded={(url) => set({ imageUrl: url })}
            onClear={() => set({ imageUrl: null })}
          />
        )}
      </Section>
      <SaveError message={state.error} errors={state.errors} />
      <div className="admin-actions"><div className="admin-actions-row">
        <button type="button" className="primary-button" onClick={save} disabled={state.saving}>
          <Save size={16} /> {state.saving ? "Saving…" : "Save slide"}
        </button>
        <button type="button" className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div></div>
    </div>
  );
}

export function HomeAdmin({ session, characters, onChange }) {
  const { data, setData, error, reload } = useContentAdmin(session, onChange);
  const [editing, setEditing] = useState(null);
  const [settingsState, setSettingsState] = useState({ saving: false, error: null, ok: null });
  const [busy, setBusy] = useState(false);
  const [showcasePack, setShowcasePack] = useState(packs[0].id);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-hint">Loading home content…</p>;

  const dropFor = (s) => data.drops.find((d) => d.id === s.dropId);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const move = (i, dir) =>
    run(async () => {
      const ids = data.slides.map((s) => s.id);
      [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
      await adminOrderSlides(session, ids);
    });

  const toggle = (s) => run(() => adminSaveSlide(session, { ...s, enabled: !s.enabled }));
  const remove = (s) => {
    if (!window.confirm(`Remove this ${KIND_LABEL[s.kind].toLowerCase()} from the hero?`)) return;
    run(() => adminDeleteSlide(session, s.id));
  };

  const addSlide = (kind, dropId) => {
    const base = { eyebrow: "", title: "", titleAccent: "", body: "", imageUrl: null, ctaLabel: "", ctaHref: "", enabled: true, sortOrder: data.slides.length };
    if (kind === "drop") return run(() => adminSaveSlide(session, { ...base, id: dropId, kind, dropId }));
    if (kind === "scratch") return run(() => adminSaveSlide(session, { ...base, id: "scratch", kind }));
    setEditing({ ...base, id: "", kind: "custom" });
  };

  const unslotted = data.drops.filter((d) => !data.slides.some((s) => s.kind === "drop" && s.dropId === d.id));
  const hasScratch = data.slides.some((s) => s.kind === "scratch");
  const settings = data.settings;
  const setSettings = (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const saveSettings = async () => {
    setSettingsState({ saving: true, error: null, ok: null });
    try {
      const saved = await adminSaveHomeSettings(session, settings);
      setSettings(saved);
      setSettingsState({ saving: false, error: null, ok: "Saved." });
      onChange();
    } catch (e) {
      setSettingsState({ saving: false, error: e.message ?? "Save failed.", ok: null });
    }
  };

  return (
    <div className="admin-home">
      <section className="admin-section">
        <header>
          <h3>Hero carousel</h3>
          <span className="admin-hint">Top to bottom = the order visitors see. Drop slides only show while their drop is live.</span>
        </header>
        <ol className="admin-slides">
          {data.slides.map((s, i) => {
            const drop = dropFor(s);
            const crew = drop ? drop.characterIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean) : [];
            return (
              <li key={s.id} className={s.enabled ? "" : "is-off"}>
                <span className="admin-slide-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="admin-slide-art">
                  {drop ? <img src={backdropFor(drop)} alt="" /> : <span className={`admin-slide-kind is-${s.kind}`}>{s.kind === "scratch" ? <Snowflake size={22} /> : <Sparkles size={22} />}</span>}
                  {crew[0] && <ItemArt art={crew[0].art} alt="" itemId={crew[0].id} size="sm" />}
                </span>
                <span className="admin-list-main">
                  <strong>{drop ? drop.title : s.kind === "scratch" ? "Scratch card" : s.title || s.id}</strong>
                  <span className="admin-hint">
                    {KIND_LABEL[s.kind]}
                    {drop && ` · ${drop.live ? dropTiming(drop).text : "drop is off"}`}
                  </span>
                </span>
                <span className="admin-slide-actions">
                  <Toggle label={s.enabled ? "On" : "Off"} checked={s.enabled} onChange={() => toggle(s)} />
                  <button type="button" className="icon-button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="icon-button" aria-label="Move down" disabled={busy || i === data.slides.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={15} />
                  </button>
                  {s.kind !== "drop" && (
                    <button type="button" className="icon-button" aria-label="Edit copy" onClick={() => setEditing({ ...s, saved: true })}>
                      <Pencil size={15} />
                    </button>
                  )}
                  <button type="button" className="icon-button" aria-label="Remove slide" disabled={busy} onClick={() => remove(s)}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        {editing && (
          <SlideEditor
            key={editing.id || "new"}
            slide={editing}
            session={session}
            onSaved={async () => {
              setEditing(null);
              await reload();
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="admin-actions"><div className="admin-actions-row">
          {unslotted.map((d) => (
            <button key={d.id} type="button" className="ghost-button" disabled={busy} onClick={() => addSlide("drop", d.id)}>
              <Plus size={15} /> Add “{d.title}”
            </button>
          ))}
          {!hasScratch && (
            <button type="button" className="ghost-button" disabled={busy} onClick={() => addSlide("scratch")}>
              <Plus size={15} /> Add scratch card
            </button>
          )}
          <button type="button" className="ghost-button" disabled={busy} onClick={() => addSlide("custom")}>
            <Plus size={15} /> Add custom slide
          </button>
        </div></div>
      </section>

      <Section title="Home page">
        <NumberInput
          label="Seconds per slide"
          value={settings.autoplaySeconds}
          onChange={(v) => setSettings({ autoplaySeconds: v ?? 0 })}
          step="1"
          min="0"
          max="60"
          hint="0 turns autoplay off."
        />
        <div className="admin-field is-wide">
          <span className="admin-label">Sections shown</span>
          <div className="admin-checks">
            {HOME_SECTIONS.map(([id, label]) => (
              <label key={id} className="admin-check">
                <input
                  type="checkbox"
                  checked={settings.sections[id] !== false}
                  onChange={(e) => setSettings({ sections: { ...settings.sections, [id]: e.target.checked } })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Section>
      <Section title="Prices">
        <Select
          label="Show prices in"
          value={settings.priceDisplay}
          onChange={(v) => setSettings({ priceDisplay: v })}
          options={[
            { id: "sol", label: "SOL" },
            { id: "usd", label: "USD ($)" },
          ]}
          hint="Every price on the site shows in this currency. Prices set in the other one are converted at today’s rate (marked ≈). Buyers always pay in SOL."
        />
      </Section>

      <Section title="Character parade">
        <CharacterPicker
          label="Characters in the parade"
          value={settings.parade.characterIds}
          onChange={(ids) => setSettings({ parade: { ...settings.parade, characterIds: ids } })}
          characters={characters}
          emptyText="No picks: every revealed character marches past."
          hint="The loop below the home hero, in this order. Characters whose art isn’t revealed yet are skipped on the site."
        />
        <NumberInput
          label="Seconds for one lap"
          value={settings.parade.seconds}
          onChange={(v) => setSettings({ parade: { ...settings.parade, seconds: v ?? 60 } })}
          step="5"
          min="10"
          max="300"
          hint="Lower is faster."
        />
      </Section>

      <Section title="Characters page">
        <Select
          label="Pack shown first"
          value={settings.showcase.defaultPack}
          onChange={(v) => setSettings({ showcase: { ...settings.showcase, defaultPack: v } })}
          options={[{ id: "", label: "The live drop’s pack (or the first pack)" }, ...packs.map((p) => ({ id: p.id, label: p.name }))]}
        />
        <Select
          label="Edit the carousel of"
          value={showcasePack}
          onChange={setShowcasePack}
          options={packs.map((p) => ({ id: p.id, label: p.name }))}
        />
        <CharacterPicker
          key={showcasePack}
          label={`${getPack(showcasePack).name} carousel`}
          value={settings.showcase.packs[showcasePack] ?? []}
          onChange={(ids) => setSettings({ showcase: { ...settings.showcase, packs: { ...settings.showcase.packs, [showcasePack]: ids } } })}
          characters={characters}
          pool={characters.filter((c) => getPack(c.pack).id === showcasePack)}
          max={30}
          emptyText="No picks: the whole pack shows, in catalogue order."
          hint="Visitors pick a pack on the Characters page and these characters rotate in the carousel, in this order."
        />
      </Section>

      <SaveError message={settingsState.error} />
      {settingsState.ok && <p className="admin-ok">{settingsState.ok}</p>}
      <div className="admin-actions"><div className="admin-actions-row">
        <button type="button" className="primary-button" onClick={saveSettings} disabled={settingsState.saving}>
          <Save size={16} /> {settingsState.saving ? "Saving…" : "Save home settings"}
        </button>
      </div></div>
    </div>
  );
}
