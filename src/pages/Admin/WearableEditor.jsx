import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Grid3x3, RotateCcw } from "lucide-react";

import CharacterRender from "../../components/characters/CharacterRender";
import WearableCard from "../../components/wardrobe/WearableCard";
import { RARITIES, WEARABLE_TYPES } from "../../data/taxonomy";
import { CHARACTER_VIEW, resolveVisual, visualBounds } from "../../render/visual";
import { fitsCharacter } from "../../services/marketplace/catalog";
import { adminDelete, adminSaveWearable } from "../../services/backend/admin";
import { Checks, NumberInput, Section, Select, TextInput } from "./fields";
import ImageUpload from "./ImageUpload";
import NftFields from "./NftFields";

const STATUSES = [
  { id: "available", label: "Available" },
  { id: "coming-soon", label: "Coming soon" },
  { id: "sold-out", label: "Sold out" },
];
const RARITY_OPTIONS = Object.values(RARITIES);

const drawable = (v) => v && (v.kind === "runs" ? v.front?.length : v.image && v.width && v.height);

// Create / edit one wearable, with a live preview drawn by the same
// CharacterRender the wardrobe uses.
function WearableEditor({ initial, characters, wearables, session, onSaved, onDeleted, onClose }) {
  const isNew = !initial.id;
  const [draft, setDraft] = useState(initial);
  // Last saved version; the NFT panel works from the saved asset only.
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const [errors, setErrors] = useState(null);
  const [status, setStatus] = useState({ busy: false, message: null, error: null });

  const dressable = characters.filter((c) => c.art?.kind === "character");
  const [previewId, setPreviewId] = useState(
    () => (dressable.find((c) => initial.compatibleCharacters.includes(c.id)) ?? dressable[0])?.id,
  );
  const preview = dressable.find((c) => c.id === previewId) ?? dressable[0];
  const [alsoWearing, setAlsoWearing] = useState([]);
  const [grid, setGrid] = useState(true);
  // Placement edits apply to every character, or only the previewed one.
  const [scope, setScope] = useState("all");

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setListing = (patch) => setDraft((d) => ({ ...d, listing: { ...d.listing, ...patch } }));
  const setVisual = (patch) => setDraft((d) => ({ ...d, visual: { ...d.visual, ...patch } }));

  const visual = draft.visual;
  const override = preview ? visual.perCharacter?.[preview.id] : null;
  const effective = resolveVisual(draft, preview?.id);

  // Placement fields read/write the base visual or this character's override.
  const placementValue = (key) => (scope === "all" ? visual[key] : (override?.[key] ?? visual[key]));
  const setPlacement = (patch) => {
    if (scope === "all") return setVisual(patch);
    setVisual({
      perCharacter: { ...(visual.perCharacter ?? {}), [preview.id]: { ...(override ?? {}), ...patch } },
    });
  };
  const resetOverride = () => {
    const rest = { ...(visual.perCharacter ?? {}) };
    delete rest[preview.id];
    setVisual({ perCharacter: Object.keys(rest).length ? rest : undefined });
  };
  const nudge = (dx, dy) =>
    setPlacement({ x: (placementValue("x") ?? 0) + dx, y: (placementValue("y") ?? 0) + dy });

  const onPreviewKey = (e) => {
    const step = e.shiftKey ? 4 : 1;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[e.key]) return;
    e.preventDefault();
    nudge(...moves[e.key]);
  };

  // Other wearables to stack with, so layering can be checked.
  const others = wearables.filter((w) => w.id !== draft.id && fitsCharacter(w, preview?.id));
  const equipped = useMemo(() => {
    const worn = others.filter((w) => alsoWearing.includes(w.id) && w.type !== draft.type);
    return drawable(draft.visual) ? [...worn, draft] : worn;
  }, [others, alsoWearing, draft]);

  const box = drawable(effective) ? visualBounds(effective) : null;
  const fitsPreview = preview && fitsCharacter(draft, preview.id);

  const save = async (publish) => {
    setStatus({ busy: true, message: null, error: null });
    setErrors(null);
    try {
      const result = await adminSaveWearable(session, { ...draft, published: publish ?? draft.published });
      setDraft(result);
      setSaved(result);
      setStatus({ busy: false, message: result.published ? "Published — it’s live in the marketplace." : "Saved as draft.", error: null });
      onSaved(result);
    } catch (error) {
      setErrors(error.details ?? null);
      setStatus({ busy: false, message: null, error: error.message });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${draft.name}” from the catalogue? Saved loadouts that use it will drop it. NFTs already minted are not affected.`)) return;
    setStatus({ busy: true, message: null, error: null });
    try {
      await adminDelete(session, "wearable", draft.id);
      onDeleted(draft.id);
    } catch (error) {
      setStatus({ busy: false, message: null, error: error.message });
    }
  };

  return (
    <div className="admin-editor">
      <div className="admin-editor-head">
        <button type="button" className="back-link" onClick={onClose}>
          <ArrowLeft size={16} /> All wearables
        </button>
        <h2>{isNew ? "New wearable" : draft.name || draft.id}</h2>
        <span className={`admin-chip ${draft.published ? "is-live" : ""}`}>{draft.published ? "Published" : "Draft"}</span>
      </div>

      <div className="admin-editor-body">
        <div className="admin-form">
          <Section title="Basics">
            <TextInput
              label="Id"
              value={draft.id}
              onChange={(v) => set({ id: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              disabled={!isNew}
              hint={isNew ? "Lowercase, dashes. Used in links and can’t change later." : null}
              errors={errors}
              path="id"
            />
            <TextInput label="Name" value={draft.name} onChange={(v) => set({ name: v })} errors={errors} path="name" />
            <TextInput label="Description" value={draft.description} onChange={(v) => set({ description: v })} errors={errors} path="description" multiline wide />
            <Select
              label="Type (wardrobe slot)"
              value={draft.type}
              options={WEARABLE_TYPES}
              onChange={(v) => setDraft((d) => ({ ...d, type: v, visual: { ...d.visual, layer: d.visual.layer === d.type ? v : d.visual.layer } }))}
              errors={errors}
              path="type"
              hint="One item per slot can be worn at a time."
            />
            <Select label="Rarity" value={draft.rarity} options={RARITY_OPTIONS} onChange={(v) => set({ rarity: v })} errors={errors} path="rarity" />
          </Section>

          <Section title="Listing">
            <Select label="Status" value={draft.listing.status} options={STATUSES} onChange={(v) => setListing({ status: v })} errors={errors} path="status" />
            <NumberInput label="Price (SOL)" value={draft.listing.price} onChange={(v) => setListing({ price: v })} min="0" errors={errors} path="price" hint="0 = free claim." />
            <NumberInput label="Supply" value={draft.listing.supply} onChange={(v) => setListing({ supply: v })} step="1" min="1" errors={errors} path="supply" />
            <NumberInput label="Limit per wallet" value={draft.listing.limitPerWallet} onChange={(v) => setListing({ limitPerWallet: v })} step="1" min="1" errors={errors} path="limit_per_wallet" hint="Empty = no limit." />
            <NumberInput label="Sort order" value={draft.sortOrder} onChange={(v) => set({ sortOrder: v ?? 0 })} step="1" errors={errors} path="sort_order" />
          </Section>

          <Section title="Compatible characters">
            <Checks
              label="Can be worn by"
              options={characters.map((c) => ({ id: c.id, label: `${c.name}${c.art?.kind === "character" ? "" : " (not dressable yet)"}` }))}
              value={draft.compatibleCharacters}
              onChange={(v) => set({ compatibleCharacters: v })}
              errors={errors}
              path="compatible_characters"
              hint="The wardrobe only lets users equip it on these characters."
            />
          </Section>

          <Section title="Visual on the character">
            <p className="admin-note is-wide">
              Layers sit on the character’s 96 × 96 pixel grid. Draw your PNG on that grid (or a 384 × 384 export at
              scale ¼) with a transparent background, then place it with x / y / scale while watching the preview.
            </p>

            {visual.kind === "runs" ? (
              <div className="admin-field is-wide">
                <span className="admin-label">Art</span>
                <p className="admin-hint">
                  Built-in pixel layers ({visual.front?.length ?? 0} runs{visual.back ? ", with a back layer" : ""}).
                  Shift them with x / y below, or replace them with an uploaded image.
                </p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    window.confirm("Replace the built-in pixel art with an uploaded image? You’ll need to upload one before saving.") &&
                    setVisual({ kind: "image", front: undefined, back: undefined, icon: undefined, bounds: undefined, image: null, width: null, height: null, x: 0, y: 0, scale: 1 })
                  }>
                  Replace with an image
                </button>
              </div>
            ) : (
              <>
                <ImageUpload
                  label="Front layer (drawn over the character)"
                  value={visual.image}
                  folder={draft.id ? `wearables/${draft.id}` : null}
                  session={session}
                  requireTransparency
                  onUploaded={(url, info) =>
                    setVisual({
                      image: url,
                      width: info.width,
                      height: info.height,
                      ...(visual.image ? {} : { x: 0, y: 0, scale: info.width >= 384 ? 96 / info.width : 1 }),
                    })
                  }
                  hint={visual.width ? `${visual.width} × ${visual.height} px` : "PNG or WebP with transparency."}
                />
                <ImageUpload
                  label="Back layer (optional, drawn behind the character)"
                  value={visual.backImage}
                  folder={draft.id ? `wearables/${draft.id}` : null}
                  session={session}
                  requireTransparency
                  onUploaded={(url) => setVisual({ backImage: url })}
                  onClear={() => setVisual({ backImage: null })}
                  hint="Same size and placement as the front layer — e.g. the bag of a backpack or the back of a cape."
                />
              </>
            )}

            <Select
              label="Layer"
              value={visual.layer ?? draft.type}
              options={WEARABLE_TYPES}
              onChange={(v) => setVisual({ layer: v })}
              errors={errors}
              path="layer"
              hint="Stacking, back to front: outfit, backpack, accessory, headwear, hat, held, special."
            />
            <NumberInput label="Order within layer (z)" value={visual.z ?? 0} onChange={(v) => setVisual({ z: v ?? 0 })} step="1" errors={errors} path="visual.z" />
          </Section>

          <Section
            title="Placement"
            aside={
              preview && (
                <div className="admin-tabs" role="group" aria-label="Placement applies to">
                  <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
                    All characters
                  </button>
                  <button type="button" aria-pressed={scope === "one"} onClick={() => setScope("one")}>
                    Only {preview.name}
                  </button>
                </div>
              )
            }>
            <NumberInput label="X" value={placementValue("x") ?? 0} onChange={(v) => setPlacement({ x: v ?? 0 })} errors={errors} path="visual.x" />
            <NumberInput label="Y" value={placementValue("y") ?? 0} onChange={(v) => setPlacement({ y: v ?? 0 })} errors={errors} path="visual.y" />
            {visual.kind === "image" && (
              <NumberInput
                label="Scale (grid px per image px)"
                value={placementValue("scale") ?? 1}
                onChange={(v) => setPlacement({ scale: v })}
                min="0.01"
                errors={errors}
                path="visual.scale"
                hint="1 for art drawn on the 96 grid, 0.25 for a 4× export."
              />
            )}
            {scope === "one" && override && (
              <div className="admin-field">
                <button type="button" className="ghost-button" onClick={resetOverride}>
                  <RotateCcw size={15} /> Use shared placement on {preview.name}
                </button>
              </div>
            )}
            {Object.keys(visual.perCharacter ?? {}).length > 0 && (
              <p className="admin-hint is-wide">
                Adjusted separately for: {Object.keys(visual.perCharacter).join(", ")}.
              </p>
            )}
          </Section>

          <Section title="NFT artwork">
            <ImageUpload
              label="Artwork for the NFT"
              value={draft.imageUrl}
              folder={draft.id ? `wearables/${draft.id}` : null}
              session={session}
              onUploaded={(url) => set({ imageUrl: url })}
              onClear={() => set({ imageUrl: null })}
              hint="The image wallets and marketplaces show for this NFT (uploaded to IPFS when metadata is generated). Required before minting. Cards and the character preview use the layers above."
            />
          </Section>

          <NftFields kind="wearable" id={saved.id} isNew={!saved.id} dirty={dirty} session={session} />
        </div>

        <aside className="admin-preview" aria-label="Preview">
          {preview ? (
            <>
              <div className="fitting-switch admin-preview-switch" role="group" aria-label="Preview character">
                {dressable.map((c) => (
                  <button key={c.id} type="button" aria-pressed={c.id === preview.id} onClick={() => setPreviewId(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>

              <div
                className={`admin-stage character-stage stage-${preview.edition}`}
                tabIndex={0}
                onKeyDown={onPreviewKey}
                aria-label="Preview — use arrow keys to nudge (shift = 4 px)">
                <CharacterRender
                  image={preview.art.image}
                  characterId={preview.id}
                  equipped={equipped}
                  alt={`${preview.name} wearing ${equipped.map((w) => w.name || w.id).join(", ") || "nothing"}`}
                />
                {grid && (
                  <svg className="admin-grid-overlay" viewBox={CHARACTER_VIEW} aria-hidden="true">
                    <rect x="0" y="0" width="96" height="96" />
                    {box && <rect className="is-box" x={box.x} y={box.y} width={box.w} height={box.h} />}
                  </svg>
                )}
                <span className="stage-floor" aria-hidden="true" />
              </div>

              <div className="admin-nudge">
                <button type="button" className="icon-button" aria-label="Move left" onClick={() => nudge(-1, 0)}><ArrowLeft size={15} /></button>
                <button type="button" className="icon-button" aria-label="Move up" onClick={() => nudge(0, -1)}><ArrowUp size={15} /></button>
                <button type="button" className="icon-button" aria-label="Move down" onClick={() => nudge(0, 1)}><ArrowDown size={15} /></button>
                <button type="button" className="icon-button" aria-label="Move right" onClick={() => nudge(1, 0)}><ArrowRight size={15} /></button>
                <span className="admin-hint">
                  x {placementValue("x") ?? 0}, y {placementValue("y") ?? 0}
                  {scope === "one" ? ` (${preview.name} only)` : ""}
                </span>
                <button type="button" className={`icon-button ${grid ? "is-on" : ""}`} aria-pressed={grid} aria-label="Show grid" onClick={() => setGrid((g) => !g)}>
                  <Grid3x3 size={15} />
                </button>
              </div>

              {!fitsPreview && (
                <p className="admin-warn">
                  Not marked compatible with {preview.name} — users won’t be able to equip it there.
                </p>
              )}
              {!drawable(draft.visual) && <p className="admin-warn">Upload a front layer to see it on the character.</p>}

              {others.length > 0 && (
                <div className="admin-also">
                  <span className="admin-label">Also wearing (to check layering)</span>
                  <div className="admin-checks">
                    {others.map((w) => (
                      <label key={w.id} className="admin-check">
                        <input
                          type="checkbox"
                          checked={alsoWearing.includes(w.id)}
                          onChange={() =>
                            setAlsoWearing((ids) => (ids.includes(w.id) ? ids.filter((id) => id !== w.id) : [...ids, w.id]))
                          }
                        />
                        {w.name}
                        {w.type === draft.type ? " (same slot)" : ""}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {drawable(draft.visual) && (
                <div className="admin-card-preview">
                  <span className="admin-label">Card</span>
                  <WearableCard wearable={{ ...draft, name: draft.name || "Untitled", art: { kind: "wearable" } }} onSelect={() => {}} />
                </div>
              )}
            </>
          ) : (
            <p className="admin-hint">Add a dressable character to preview wearables.</p>
          )}
        </aside>
      </div>

      <div className="admin-actions">
        {status.error && <p className="admin-error">{status.error}</p>}
        {status.message && <p className="admin-ok">{status.message}</p>}
        <div className="admin-actions-row">
          {!isNew && (
            <button type="button" className="ghost-button is-danger" onClick={remove} disabled={status.busy}>
              Delete
            </button>
          )}
          <span className="admin-spacer" />
          <button type="button" className="ghost-button" onClick={() => save(false)} disabled={status.busy}>
            {draft.published ? "Unpublish & save" : "Save draft"}
          </button>
          <button type="button" className="primary-button" onClick={() => save(true)} disabled={status.busy}>
            {status.busy ? "Saving…" : draft.published ? "Save & keep live" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WearableEditor;
