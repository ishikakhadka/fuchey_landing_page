import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

import { adminStudioList } from "../../services/backend/admin";

// "From the animator" next to an image field (the NFT artwork): pick a pack, an
// approved animator character and a size, and use its still picture (the
// character standing, neutral face, a PNG on a transparent background) instead
// of uploading a file. Starts on the character this item was imported from.

function StudioPicture({ session, studioRef, value, onPick }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [packId, setPackId] = useState("");
  const [charId, setCharId] = useState("");
  const [scale, setScale] = useState(4);

  useEffect(() => {
    let active = true;
    adminStudioList(session).then(
      (r) => {
        if (!active) return;
        const approved = r.characters.filter((c) => c.approved_version);
        setList(approved);
        const start = studioRef ? approved.find((c) => c.pack_id === studioRef.pack && c.character_id === studioRef.character) : null;
        setPackId(start?.pack_id ?? approved[0]?.pack_id ?? "");
        setCharId(start?.character_id ?? "");
      },
      (e) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
    // Only on open: later edits shouldn't move the pickers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (error) return <p className="admin-error is-wide">Animator pictures: {error}</p>;
  if (!list) return <p className="admin-hint is-wide">Loading animator pictures…</p>;
  if (!list.length) return <p className="admin-hint is-wide">No approved animator characters yet, so there are no pictures to pick from.</p>;

  const packs = [...new Map(list.map((c) => [c.pack_id, c.pack_name])).entries()];
  const inPack = list.filter((c) => c.pack_id === packId);
  const chosen = inPack.find((c) => c.character_id === charId) ?? null;
  const version = chosen?.versions.find((v) => v.version === chosen.approved_version) ?? null;
  const stills = (version?.renders ?? []).filter((r) => r.kind === "preview").sort((a, b) => a.scale - b.scale);
  const still = stills.find((r) => r.scale === scale) ?? stills.at(-1) ?? null;
  const inUse = still && value === still.url;

  return (
    <div className="admin-field is-wide studio-picture">
      <span className="admin-label">Or use a picture from the animator</span>
      <div className="studio-picture-row">
        <label>
          <span className="studio-picture-label">Pack</span>
          <select
            value={packId}
            onChange={(e) => {
              setPackId(e.target.value);
              setCharId("");
            }}>
            {packs.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="studio-picture-label">Character</span>
          <select value={charId} onChange={(e) => setCharId(e.target.value)}>
            <option value="">Choose…</option>
            {inPack.map((c) => (
              <option key={c.character_id} value={c.character_id}>
                {c.name} (version {c.approved_version})
              </option>
            ))}
          </select>
        </label>
        {stills.length > 0 && (
          <label>
            <span className="studio-picture-label">Size</span>
            <select value={still?.scale ?? scale} onChange={(e) => setScale(Number(e.target.value))}>
              {stills.map((r) => (
                <option key={r.scale} value={r.scale}>
                  {r.scale}× ({r.width}×{r.height})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {still && (
        <div className="studio-picture-pick">
          <img src={still.url} alt={`${chosen.name}, still picture`} className="admin-upload-thumb studio-picture-thumb" />
          <button type="button" className="ghost-button" disabled={inUse} onClick={() => onPick(still.url)}>
            <ImagePlus size={15} /> {inUse ? "In use" : "Use this picture"}
          </button>
        </div>
      )}
    </div>
  );
}

export default StudioPicture;
