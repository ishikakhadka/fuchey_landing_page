import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Trash2, UserPlus, X } from "lucide-react";

import {
  adminStudioAddMember,
  adminStudioList,
  adminStudioRemoveMember,
  adminStudioReview,
} from "../../services/backend/admin";
import { Section, TextInput } from "./fields";
import { gifsByAnimation, kb } from "./studio";
import StudioWardrobe from "./StudioWardrobe";
import ListControls from "./ListControls";
import { ALL, applyListView, emptyView, packOptions } from "./listView";

// Admin → Animator. Characters published from the Fuchey Animator, newest
// version first: watch every animation at every size, then approve or send
// back with a note. Approved versions can be imported into the marketplace
// from the Character editor ("Import from animator"). Below the queue: the
// wallets allowed to sign in to the animator (admins always can).
// The Wardrobe view (StudioWardrobe.jsx) does the same for wardrobe items.

const STATUS_LABEL = { in_review: "Waiting for review", approved: "Approved", rejected: "Sent back" };
const STATUS_CLASS = { in_review: "", approved: "is-live", rejected: "is-bad" };

const short = (w) => (w ? `${w.slice(0, 4)}…${w.slice(-4)}` : "");
const when = (iso) => (iso ? new Date(iso).toLocaleString() : "");

function VersionCard({ ch, version, session, linked, onChanged }) {
  const gifs = useMemo(() => gifsByAnimation(version), [version]);
  const anims = Object.keys(gifs);
  const scales = [...new Set(version.renders.filter((r) => r.kind === "gif").map((r) => r.scale))].sort((a, b) => a - b);
  const [anim, setAnim] = useState(anims.includes("idle") ? "idle" : anims[0]);
  const [scale, setScale] = useState(scales.includes(2) ? 2 : scales[0]);
  const [note, setNote] = useState(version.review_note ?? "");
  const [state, setState] = useState({ busy: false, error: null });
  const gif = gifs[anim]?.[scale] ?? gifs[anim]?.[scales[0]];
  const total = version.renders.reduce((s, r) => s + r.bytes, 0);

  const review = async (decision) => {
    setState({ busy: true, error: null });
    try {
      await adminStudioReview(session, version.id, decision, note);
      setState({ busy: false, error: null });
      onChanged();
    } catch (e) {
      setState({ busy: false, error: e.message });
    }
  };

  return (
    <div className="studio-version">
      <div className="studio-player">
        {gif ? <img src={gif.url} alt={`${ch.name}: ${anim}`} className="studio-gif" style={{ maxWidth: gif.width, maxHeight: gif.height }} /> : <p className="admin-hint">No GIF</p>}
      </div>
      <div className="studio-version-main">
        <div className="studio-version-head">
          <strong>Version {version.version}</strong>
          <span className={`admin-chip ${STATUS_CLASS[version.status] ?? ""}`}>{STATUS_LABEL[version.status] ?? version.status}</span>
          {linked.map((c) => (
            <span key={c.id} className="admin-chip is-ok" title="Marketplace character made from this version">
              In marketplace: {c.name}
            </span>
          ))}
        </div>
        <p className="admin-hint">
          Sent by <span className="mono">{short(version.submitted_by)}</span> · {when(version.submitted_at)} · {anims.length} animations ×{" "}
          {scales.map((s) => `${s}×`).join(" ")} · {kb(total)}
          {version.art_check?.warnings ? ` · ${version.art_check.warnings} art-check warning(s)` : ""}
        </p>
        <div className="studio-picks" role="group" aria-label="Animation">
          {anims.map((a) => (
            <button key={a} type="button" className={`studio-pick ${a === anim ? "is-on" : ""}`} aria-pressed={a === anim} onClick={() => setAnim(a)}>
              {version.animations?.[a]?.label?.replace(/\s*\(.*\)$/, "") || a}
            </button>
          ))}
        </div>
        <div className="studio-picks" role="group" aria-label="Size">
          {scales.map((s) => {
            const r = gifs[anim]?.[s];
            return (
              <button key={s} type="button" className={`studio-pick ${s === scale ? "is-on" : ""}`} aria-pressed={s === scale} onClick={() => setScale(s)}>
                {s}× {r ? `· ${r.width}×${r.height} · ${kb(r.bytes)}` : ""}
              </button>
            );
          })}
          {gif && (
            <a className="studio-pick" href={gif.url} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> Open file
            </a>
          )}
        </div>
        {version.status === "in_review" || version.status === "approved" || version.status === "rejected" ? (
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
        ) : null}
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

function Members({ session, members, onChanged }) {
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const add = async () => {
    setError(null);
    try {
      await adminStudioAddMember(session, wallet.trim(), note);
      setWallet("");
      setNote("");
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (w) => {
    if (!window.confirm(`Remove ${short(w)} from the animator?`)) return;
    try {
      await adminStudioRemoveMember(session, w);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Section title="Who can use the animator">
      <p className="admin-hint is-wide">
        Admin wallets can always sign in. Add an artist’s wallet so they can sign in and publish characters for review.
      </p>
      <ul className="studio-members is-wide">
        {members.map((m) => (
          <li key={m.wallet}>
            <code className="mono">{m.wallet}</code>
            <span className="admin-hint">{m.note}</span>
            <button type="button" className="icon-button" aria-label={`Remove ${m.wallet}`} onClick={() => remove(m.wallet)}>
              <Trash2 size={15} />
            </button>
          </li>
        ))}
        {!members.length && <li className="admin-hint">No artists yet.</li>}
      </ul>
      <TextInput label="Wallet address" value={wallet} onChange={setWallet} />
      <TextInput label="Note (who is this?)" value={note} onChange={setNote} />
      <div className="is-wide">
        <button type="button" className="ghost-button" onClick={add} disabled={!wallet.trim()}>
          <UserPlus size={15} /> Add artist
        </button>
        {error && <p className="admin-error">{error}</p>}
      </div>
    </Section>
  );
}

function StudioAdmin({ session, onCount }) {
  const [area, setArea] = useState("characters");
  const [wardrobeWaiting, setWardrobeWaiting] = useState(0);
  return (
    <>
      <div className="admin-tabs studio-area" role="group" aria-label="Animator">
        <button type="button" aria-pressed={area === "characters"} onClick={() => setArea("characters")}>
          Characters
        </button>
        <button type="button" aria-pressed={area === "wardrobe"} onClick={() => setArea("wardrobe")}>
          Wardrobe{wardrobeWaiting ? ` (${wardrobeWaiting})` : ""}
        </button>
      </div>
      {area === "wardrobe" ? (
        <StudioWardrobe session={session} onCount={setWardrobeWaiting} />
      ) : (
        <StudioCharacters session={session} onCount={onCount} />
      )}
    </>
  );
}

function StudioCharacters({ session, onCount }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const [view, setView] = useState(emptyView);
  const [show, setShow] = useState("waiting");

  useEffect(() => {
    let active = true;
    adminStudioList(session).then(
      (r) => {
        if (!active) return;
        setData(r);
        onCount?.(r.characters.filter((c) => c.versions.some((v) => v.status === "in_review")).length);
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [session, version, onCount]);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-hint">Loading the animator…</p>;

  const reload = () => setVersion((v) => v + 1);
  const packName = (id) => data.characters.find((c) => c.pack_id === id)?.pack_name ?? id;
  const byStatus = data.characters.filter(
    (c) => show === "all" || (show === "waiting" ? c.versions[0]?.status === "in_review" : c.approved_version),
  );
  const list = applyListView(byStatus, view, { pack: (c) => c.pack_id, also: (c) => [c.character_id] });
  const linkedTo = (c, v) =>
    data.linked.filter((m) => m.studio?.pack === c.pack_id && m.studio?.character === c.character_id && m.studio?.version === v.version);

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
        packs={packOptions(data.characters, { pack: (c) => c.pack_id, label: packName })}
        placeholder="Search characters by name"
        noun={`${list.length} of ${byStatus.length}`}
      />

      {!list.length && (
        <p className="admin-hint">
          {!data.characters.length
            ? "Nothing published yet. In the Fuchey Animator, sign in and press Publish to Fuchey on a character."
            : view.query
              ? `No characters match “${view.query}”${view.pack !== ALL ? ` in ${packName(view.pack)}` : ""}.`
              : view.pack !== ALL
                ? `No characters in ${packName(view.pack)} for this filter.`
                : "Nothing here. Try another filter."}
        </p>
      )}

      {list.map((c) => (
        <section key={c.id} className="admin-section studio-character">
          <header>
            <h3>
              {c.name} <small className="admin-hint">· {c.pack_name}</small>
            </h3>
            <span className="admin-hint mono">
              {c.pack_id}/{c.character_id}
            </span>
          </header>
          {(show === "all" ? c.versions : show === "approved" ? c.versions.filter((v) => v.status === "approved").slice(0, 1) : c.versions.slice(0, 1))
            .map((v) => (
              <VersionCard key={v.id} ch={c} version={v} session={session} linked={linkedTo(c, v)} onChanged={reload} />
            ))}
        </section>
      ))}

      <Members session={session} members={data.members} onChanged={reload} />
    </div>
  );
}

export default StudioAdmin;
