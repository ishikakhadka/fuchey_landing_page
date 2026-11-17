import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import { adminStudioList } from "../../services/backend/admin";
import { packs } from "../../data/packs";
import { Field, Section } from "./fields";
import { gifsByAnimation, kb, previewOf, siteId } from "./studio";

// "Import from animator" in the Character editor: pick a pack, then one of
// its approved animator characters, and the form is filled from the approved
// version: id, name, pack, base art (the still preview), the website GIF and
// the NFT artwork. Nothing is uploaded by hand, so names and pictures stay the
// same as in the animator. The character remembers the version it came from
// (`studio`), and this panel offers an update when a newer one is approved.

// The site pack an animator pack belongs to: same id, plural, or same name.
function sitePackFor(c) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    packs.find((p) => p.id === siteId(c.pack_id)) ??
    packs.find((p) => p.id === `${siteId(c.pack_id)}s`) ??
    packs.find((p) => norm(p.name) === norm(c.pack_name)) ??
    null
  );
}

function StudioImport({ session, draft, isNew, onApply }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [packId, setPackId] = useState("");
  const [charKey, setCharKey] = useState("");
  const [anim, setAnim] = useState("idle");
  const [scale, setScale] = useState(2);
  const [message, setMessage] = useState(null);
  const studioRef = draft.studio;

  useEffect(() => {
    let active = true;
    adminStudioList(session).then(
      (r) => {
        if (!active) return;
        const approved = r.characters.filter((c) => c.approved_version);
        setList(approved);
        // Start on the character's own animator source when it has one.
        const start = studioRef ? approved.find((c) => c.pack_id === studioRef.pack && c.character_id === studioRef.character) : null;
        setPackId(start?.pack_id ?? approved[0]?.pack_id ?? "");
        setCharKey(start?.character_id ?? "");
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
    // Only on open: later edits to the draft shouldn't move the pickers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const approvedOf = (c) => c?.versions.find((v) => v.version === c.approved_version) ?? null;
  const packOptions = useMemo(() => [...new Map((list ?? []).map((c) => [c.pack_id, c.pack_name])).entries()], [list]);
  const inPack = (list ?? []).filter((c) => c.pack_id === packId);
  const chosen = inPack.find((c) => c.character_id === charKey) ?? null;
  const version = approvedOf(chosen);
  const gifs = gifsByAnimation(version);
  const anims = Object.keys(gifs);
  const scales = [...new Set(Object.values(gifs).flatMap((g) => Object.keys(g).map(Number)))].sort((a, b) => a - b);

  // The character this one was imported from, and whether a newer version is approved.
  const source = draft.studio ? (list ?? []).find((c) => c.pack_id === draft.studio.pack && c.character_id === draft.studio.character) : null;
  const newer = source && source.approved_version > draft.studio.version ? approvedOf(source) : null;

  const fill = (c, v, animKey = anim, size = scale) => {
    const g = gifsByAnimation(v);
    const a = g[animKey] ? animKey : g.idle ? "idle" : Object.keys(g)[0];
    const gif = g[a]?.[size] ?? Object.values(g[a] ?? {}).at(-1);
    const still = previewOf(v, 2);
    const big = (v.renders ?? []).filter((r) => r.kind === "preview").sort((x, y) => y.scale - x.scale)[0];
    const pack = sitePackFor(c);
    onApply({
      ...(isNew ? { id: siteId(c.character_id) } : {}),
      name: c.name,
      ...(draft.title ? {} : { title: `Fuchey ${c.name}` }),
      ...(pack ? { pack: pack.id } : {}),
      art: { kind: "character", image: still?.url ?? null },
      displayUrl: gif?.url ?? null,
      imageUrl: big?.url ?? draft.imageUrl ?? null,
      studio: { pack: c.pack_id, character: c.character_id, version: v.version },
    });
    setMessage(
      `Filled from ${c.name} version ${v.version}: ${a} at ${gif?.width}×${gif?.height} for the website, the ${big?.width}×${big?.height} still for the NFT.` +
        (pack ? "" : ` No marketplace pack matches “${c.pack_name}”: add it under Packs, then pick it here.`) +
        " Save to keep it.",
    );
  };

  return (
    <Section title="Import from animator">
      {error && <p className="admin-error is-wide">{error}</p>}
      {!list && !error && <p className="admin-hint is-wide">Loading approved characters…</p>}
      {list && !list.length && (
        <p className="admin-hint is-wide">No approved animator characters yet. Approve one under Admin → Animator first.</p>
      )}

      {draft.studio && (
        <div className="studio-source is-wide">
          <span className="admin-chip is-ok">
            From animator: {draft.studio.pack}/{draft.studio.character} · version {draft.studio.version}
          </span>
          {newer && (
            <button type="button" className="ghost-button" onClick={() => fill(source, newer)}>
              <RefreshCw size={15} /> Version {newer.version} is approved: update pictures
            </button>
          )}
        </div>
      )}

      {list?.length > 0 && (
        <>
          <Field label="Pack">
            {(id) => (
              <select
                id={id}
                value={packId}
                onChange={(e) => {
                  setPackId(e.target.value);
                  setCharKey("");
                }}>
                {packOptions.map(([pid, name]) => (
                  <option key={pid} value={pid}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Character">
            {(id) => (
              <select id={id} value={charKey} onChange={(e) => setCharKey(e.target.value)}>
                <option value="">Choose…</option>
                {inPack.map((c) => (
                  <option key={c.character_id} value={c.character_id}>
                    {c.name} (version {c.approved_version})
                  </option>
                ))}
              </select>
            )}
          </Field>
          {version && (
            <>
              <Field label="Animation for the website">
                {(id) => (
                  <select id={id} value={anims.includes(anim) ? anim : anims[0]} onChange={(e) => setAnim(e.target.value)}>
                    {anims.map((a) => (
                      <option key={a} value={a}>
                        {version.animations?.[a]?.label?.replace(/\s*\(.*\)$/, "") || a}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Size">
                {(id) => (
                  <select id={id} value={scales.includes(scale) ? scale : scales[0]} onChange={(e) => setScale(Number(e.target.value))}>
                    {scales.map((s) => {
                      const r = gifs[anims.includes(anim) ? anim : anims[0]]?.[s];
                      return (
                        <option key={s} value={s}>
                          {s}× {r ? `(${r.width}×${r.height}, ${kb(r.bytes)})` : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </Field>
              <div className="studio-import-preview is-wide">
                {(() => {
                  const a = anims.includes(anim) ? anim : anims[0];
                  const r = gifs[a]?.[scales.includes(scale) ? scale : scales[0]];
                  return r ? <img src={r.url} alt={`${chosen.name}: ${a}`} className="studio-gif" style={{ maxWidth: Math.min(r.width, 320) }} /> : null;
                })()}
                <button type="button" className="primary-button" onClick={() => fill(chosen, version)}>
                  <Download size={15} /> Fill from animator
                </button>
              </div>
            </>
          )}
        </>
      )}
      {message && <p className="admin-ok is-wide">{message}</p>}
    </Section>
  );
}

export default StudioImport;
