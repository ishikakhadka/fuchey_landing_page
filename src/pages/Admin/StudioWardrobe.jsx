import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import CharacterRender from "../../components/characters/CharacterRender";
import { CHARACTER_VIEW } from "../../render/visual";
import { buildVisual, SITE_SLOT } from "../../../supabase/functions/_shared/wardrobeFit.js";
import { adminStudioWearableList, adminStudioWearableReview } from "../../services/backend/admin";
import ListControls from "./ListControls";
import { ALL, applyListView, emptyView, packOptions } from "./listView";

// Admin → Animator → Wardrobe. Wardrobe items published from the Fuchey
// Animator, newest version first. Each character the item fits shows two
// pictures side by side:
//   On the website   the website's own renderer: the character's imported base
//                    art with the item placed by the same formula the import uses
//   In the animator  the animator's render of that character wearing it
// "Overlay" stacks them with a difference blend: anything that isn't black is
// a pixel that differs. Approved versions are added to the wardrobe from the
// Wearable editor ("Import from animator").

const STATUS_LABEL = { in_review: "Waiting for review", approved: "Approved", rejected: "Sent back" };
const STATUS_CLASS = { in_review: "", approved: "is-live", rejected: "is-bad" };
const short = (w) => (w ? `${w.slice(0, 4)}…${w.slice(-4)}` : "");
const when = (iso) => (iso ? new Date(iso).toLocaleString() : "");

function FitPreview({ item, fit, linked, overlay }) {
  const site = linked.find((l) => l.pack === item.pack_id && l.character === fit.character_id);
  const { visual } = useMemo(
    () => buildVisual(item.slot, [fit], (c) => (c === fit.character_id && site ? site.siteId : null)),
    [item.slot, fit, site],
  );
  const wearable = visual ? { id: `studio-${fit.id}`, name: item.name, type: SITE_SLOT[item.slot], visual } : null;
  return (
    <figure className="wardrobe-fit">
      <figcaption>
        <strong>{site?.name ?? fit.character_id}</strong>
        {!site && <span className="admin-chip is-bad">Not on the website yet</span>}
      </figcaption>
      <div className={`wardrobe-fit-pics ${overlay ? "is-overlay" : ""}`}>
        {site && wearable && (
          <div className="wardrobe-fit-pic">
            <CharacterRender dressing art={site.art} characterId={site.siteId} equipped={[wearable]} alt={`${site.name} wearing ${item.name} on the website`} />
            {!overlay && <span>On the website</span>}
          </div>
        )}
        {fit.files.preview && (
          <div className="wardrobe-fit-pic is-animator">
            {/* the animator's still, placed exactly like an imported base so the two line up */}
            <svg className="character-render" viewBox={CHARACTER_VIEW} role="img" aria-label={`${fit.character_id} wearing ${item.name} in the animator`}>
              <image href={fit.files.preview} x="0" y="0" width="96" height="96" style={{ imageRendering: "pixelated" }} />
            </svg>
            {!overlay && <span>In the animator</span>}
          </div>
        )}
      </div>
      <p className="admin-hint mono">
        x {fit.site.x} · y {fit.site.y} · {fit.site.width}×{fit.site.height} px × {fit.site.scale} · box {fit.placement.box.w}×{fit.placement.box.h} at{" "}
        {fit.placement.box.x},{fit.placement.box.y} · offset {fit.placement.offset.join(",")} · canvas {fit.canvas_w}×{fit.canvas_h}
      </p>
    </figure>
  );
}

function WardrobeVersion({ item, version, session, linked, imported, onChanged }) {
  const [note, setNote] = useState(version.review_note ?? "");
  const [overlay, setOverlay] = useState(false);
  const [state, setState] = useState({ busy: false, error: null });
  const review = async (decision) => {
    setState({ busy: true, error: null });
    try {
      await adminStudioWearableReview(session, version.id, decision, note);
      setState({ busy: false, error: null });
      onChanged();
    } catch (e) {
      setState({ busy: false, error: e.message });
    }
  };
  const live = imported.filter((w) => w.studio?.pack === item.pack_id && w.studio?.slot === item.slot && w.studio?.item === item.item_id && w.studio?.version === version.version);

  return (
    <div className="studio-version wardrobe-version">
      <div className="studio-version-main">
        <div className="studio-version-head">
          <strong>Version {version.version}</strong>
          <span className={`admin-chip ${STATUS_CLASS[version.status] ?? ""}`}>{STATUS_LABEL[version.status] ?? version.status}</span>
          {live.map((w) => (
            <span key={w.id} className="admin-chip is-ok" title="Wardrobe item made from this version">
              In wardrobe: {w.name}
            </span>
          ))}
          <label className="wardrobe-overlay">
            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Overlay
          </label>
        </div>
        <p className="admin-hint">
          Sent by <span className="mono">{short(version.submitted_by)}</span> · {when(version.submitted_at)} · {version.fits.length} character
          {version.fits.length === 1 ? "" : "s"} · website slot {SITE_SLOT[item.slot]}
          {version.art_check?.warnings ? ` · ${version.art_check.warnings} art-check warning(s)` : ""}
        </p>
        <div className="wardrobe-fits">
          {version.fits.map((f) => (
            <FitPreview key={f.id} item={item} fit={f} linked={linked} overlay={overlay} />
          ))}
        </div>
        <div className="studio-review">
          <input
            aria-label="Note for the artist"
            placeholder={version.status === "in_review" ? "Note for the artist (needed to send back)" : "Note"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {version.status !== "approved" && (
            <button type="button" className="primary-button" disabled={state.busy} onClick={() => review("approve")}>
              <Check size={15} /> Approve
            </button>
          )}
          {version.status !== "rejected" && (
            <button type="button" className="ghost-button is-danger" disabled={state.busy} onClick={() => review("reject")}>
              <X size={15} /> {version.status === "approved" ? "Withdraw approval" : "Send back"}
            </button>
          )}
        </div>
        {version.reviewed_at && (
          <p className="admin-hint">
            {STATUS_LABEL[version.status]} by <span className="mono">{short(version.reviewed_by)}</span> · {when(version.reviewed_at)}
          </p>
        )}
        {state.error && <p className="admin-error">{state.error}</p>}
      </div>
    </div>
  );
}

function StudioWardrobe({ session, onCount }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [show, setShow] = useState("waiting");
  const [view, setView] = useState(emptyView);

  useEffect(() => {
    let active = true;
    adminStudioWearableList(session).then(
      (r) => {
        if (!active) return;
        setData(r);
        onCount?.(r.wearables.filter((w) => w.versions[0]?.status === "in_review").length);
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [session, reload, onCount]);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-hint">Loading the wardrobe…</p>;

  const byStatus = data.wearables.filter((w) =>
    show === "all" ? true : show === "waiting" ? w.versions[0]?.status === "in_review" : w.approved_version,
  );
  const packName = (id) => data.wearables.find((w) => w.pack_id === id)?.pack_name ?? id;
  const list = applyListView(byStatus, view, { pack: (w) => w.pack_id, also: (w) => [w.item_id, w.slot, w.group_label ?? "", w.variant_label ?? ""] });
  const changed = () => setReload((v) => v + 1);
  const versionsFor = (w) =>
    show === "all" ? w.versions : show === "approved" ? w.versions.filter((v) => v.status === "approved").slice(0, 1) : w.versions.slice(0, 1);
  // Items in list order, with colour variants of one group gathered where the group first appears
  // (default variant first, then by label).
  const segments = (items) => {
    const out = [];
    const seen = new Set();
    for (const w of items) {
      if (!w.group_key) {
        out.push({ items: [w] });
        continue;
      }
      const k = `${w.pack_id}/${w.group_key}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const members = items
        .filter((x) => x.pack_id === w.pack_id && x.group_key === w.group_key)
        .sort((a, b) => Number(b.variant_default) - Number(a.variant_default) || (a.variant_label ?? "").localeCompare(b.variant_label ?? ""));
      out.push({ group: w.group_key, pack: w.pack_id, label: w.group_label, items: members });
    }
    return out;
  };

  return (
    <div className="studio-admin">
      <div className="studio-filters">
        <div className="admin-tabs" role="group" aria-label="Show">
          {[
            ["waiting", "Waiting for review"],
            ["approved", "Approved"],
            ["all", "Everything"],
          ].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={show === id} onClick={() => setShow(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <ListControls
        view={view}
        onChange={setView}
        packs={packOptions(data.wearables, { pack: (w) => w.pack_id, label: packName })}
        placeholder="Search wardrobe items by name"
        noun={`${list.length} of ${byStatus.length}`}
      />
      {!list.length && (
        <p className="admin-hint">
          {!data.wearables.length
            ? "No wardrobe items yet. In the Fuchey Animator, sign in and press Publish wardrobe."
            : view.pack !== ALL && !view.query && !byStatus.some((w) => w.pack_id === view.pack)
              ? `No wardrobes found in ${packName(view.pack)} for this filter.`
              : view.query
                ? `No wardrobe items match “${view.query}”${view.pack !== ALL ? ` in ${packName(view.pack)}` : ""}.`
                : "Nothing here. Try another filter."}
        </p>
      )}
      {segments(list).map((seg) =>
        seg.group ? (
          // Colour variants of one element: one parent block, each variant still reviewed on its own.
          <section key={`g-${seg.pack}-${seg.group}`} className="admin-section studio-character wardrobe-group">
            <header>
              <h3>
                {seg.label} <small className="admin-hint">· {seg.items[0].pack_name} · {seg.items.length} variant{seg.items.length === 1 ? "" : "s"}</small>
              </h3>
              <span className="wardrobe-group-chips">
                {seg.items.map((w) => (
                  <span key={w.id} className={`admin-chip ${STATUS_CLASS[w.versions[0]?.status] ?? ""}`} title={STATUS_LABEL[w.versions[0]?.status] ?? ""}>
                    {w.variant_label}
                    {w.variant_default ? " (default)" : ""}: {STATUS_LABEL[w.versions[0]?.status] ?? "—"}
                  </span>
                ))}
              </span>
            </header>
            {seg.items.map((w) => (
              <div key={w.id} className="wardrobe-variant">
                <h4>
                  {w.variant_label}
                  {w.variant_default ? " (default)" : ""} <small className="admin-hint mono">{w.slot}_{w.item_id}</small>
                </h4>
                {versionsFor(w).map((v) => (
                  <WardrobeVersion key={v.id} item={w} version={v} session={session} linked={data.linked} imported={data.imported} onChanged={changed} />
                ))}
              </div>
            ))}
          </section>
        ) : (
          <section key={seg.items[0].id} className="admin-section studio-character">
            <header>
              <h3>
                {seg.items[0].name} <small className="admin-hint">· {seg.items[0].pack_name}</small>
              </h3>
              <span className="admin-hint mono">
                {seg.items[0].pack_id}/{seg.items[0].slot}_{seg.items[0].item_id}
              </span>
            </header>
            {versionsFor(seg.items[0]).map((v) => (
              <WardrobeVersion key={v.id} item={seg.items[0]} version={v} session={session} linked={data.linked} imported={data.imported} onChanged={changed} />
            ))}
          </section>
        ),
      )}
    </div>
  );
}

export default StudioWardrobe;
