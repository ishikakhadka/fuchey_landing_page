import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import { RARITIES, WEARABLE_TYPES } from "../../data/taxonomy";
import { editions } from "../../data/editions";
import { fitsCharacter } from "../../services/marketplace/catalog";
import { adminDelete, adminSaveCharacter } from "../../services/backend/admin";
import { Checks, Field, NumberInput, Section, Select, TextInput, SaveError } from "./fields";
import ImageUpload from "./ImageUpload";
import NftFields from "./NftFields";

const STATUSES = [
  { id: "available", label: "Available" },
  { id: "coming-soon", label: "Coming soon" },
  { id: "sold-out", label: "Sold out" },
];
const BUILT_IN = [
  { id: "yeti", label: "Yeti (built-in)" },
  { id: "cyber", label: "Cyber Yeti (built-in)" },
];
const EDITION_OPTIONS = Object.values(editions).map((e) => ({ id: e.id, label: e.label }));

// Create / edit a character. Base art stays separate from wearable layers:
// it's either built-in art, an uploaded 96×96 PNG, or a placeholder sprite.
function CharacterEditor({ initial, wearables, session, onSaved, onDeleted, onClose }) {
  const isNew = !initial.id;
  const [draft, setDraft] = useState(initial);
  // Last saved version; the NFT panel works from the saved asset only.
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const [errors, setErrors] = useState(null);
  const [status, setStatus] = useState({ busy: false, message: null, error: null });
  const [spriteText, setSpriteText] = useState(() =>
    initial.art.kind === "sprite" ? JSON.stringify(initial.art.sprite, null, 1) : "",
  );
  const [spriteError, setSpriteError] = useState(null);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setListing = (patch) => setDraft((d) => ({ ...d, listing: { ...d.listing, ...patch } }));
  const setArt = (patch) => setDraft((d) => ({ ...d, art: { ...d.art, ...patch } }));
  const setAttr = (i, patch) =>
    set({ attributes: draft.attributes.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  const compatible = wearables.filter((w) => fitsCharacter(w, draft.id));

  const save = async (publish) => {
    setStatus({ busy: true, message: null, error: null });
    setErrors(null);
    try {
      const result = await adminSaveCharacter(session, { ...draft, published: publish });
      setDraft(result);
      setSaved(result);
      setStatus({ busy: false, message: result.published ? "Published." : "Saved as draft.", error: null });
      onSaved(result);
    } catch (error) {
      setErrors(error.details ?? null);
      setStatus({ busy: false, message: null, error: error.message });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${draft.name}”? Its saved loadouts go too. NFTs already minted are not affected.`)) return;
    try {
      await adminDelete(session, "character", draft.id);
      onDeleted(draft.id);
    } catch (error) {
      setStatus({ busy: false, message: null, error: error.message });
    }
  };

  const builtIn = draft.art.kind === "character" && BUILT_IN.some((b) => b.id === draft.art.image);

  return (
    <div className="admin-editor">
      <div className="admin-editor-head">
        <button type="button" className="back-link" onClick={onClose}>
          <ArrowLeft size={16} /> All characters
        </button>
        <h2>{isNew ? "New character" : draft.name || draft.id}</h2>
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
            <TextInput label="Title" value={draft.title} onChange={(v) => set({ title: v })} errors={errors} path="title" hint="e.g. Fuchey Yeti — also the NFT name." />
            <TextInput label="Tagline" value={draft.tagline} onChange={(v) => set({ tagline: v })} errors={errors} path="tagline" />
            <TextInput label="Quote" value={draft.quote} onChange={(v) => set({ quote: v })} errors={errors} path="quote" wide />
            <TextInput label="Description" value={draft.description} onChange={(v) => set({ description: v })} errors={errors} path="description" multiline wide />
            <Select label="Edition (theme)" value={draft.edition} options={EDITION_OPTIONS} onChange={(v) => set({ edition: v })} errors={errors} path="edition" />
            <TextInput label="Edition label" value={draft.editionLabel} onChange={(v) => set({ editionLabel: v })} errors={errors} path="edition_label" />
            <Select label="Rarity" value={draft.rarity} options={Object.values(RARITIES)} onChange={(v) => set({ rarity: v })} errors={errors} path="rarity" />
          </Section>

          <Section title="Base art">
            <Select
              label="Kind"
              value={draft.art.kind}
              options={[
                { id: "character", label: "Character (can wear items)" },
                { id: "sprite", label: "Placeholder sprite (coming soon)" },
              ]}
              onChange={(kind) =>
                set({ art: kind === "character" ? { kind, image: "yeti" } : { kind, sprite: { palette: { o: "#1b2430" }, rows: ["o"] }, locked: true } })
              }
            />
            {draft.art.kind === "character" ? (
              <>
                <Select
                  label="Image"
                  value={builtIn ? draft.art.image : "upload"}
                  options={[...BUILT_IN, { id: "upload", label: "Uploaded image" }]}
                  onChange={(v) => setArt({ image: v === "upload" ? null : v })}
                  errors={errors}
                  path="art.image"
                />
                {!builtIn && (
                  <ImageUpload
                    label="Base art (96 × 96 pixel art, or a 384 × 384 export)"
                    value={draft.art.image}
                    folder={draft.id ? `characters/${draft.id}` : null}
                    session={session}
                    onUploaded={(url) => setArt({ image: url })}
                    hint="Drawn on the same 96 × 96 grid as the Yeti, so wearables line up. New body shapes can use per-character placement on each wearable."
                  />
                )}
              </>
            ) : (
              <>
                <Field label="Sprite (JSON: { palette, rows })" errors={spriteError ? [`sprite: ${spriteError}`] : errors} path={spriteError ? "sprite" : "art.sprite"} wide>
                  {(id) => (
                    <textarea
                      id={id}
                      rows={10}
                      className="mono"
                      value={spriteText}
                      onChange={(e) => {
                        setSpriteText(e.target.value);
                        try {
                          setArt({ sprite: JSON.parse(e.target.value) });
                          setSpriteError(null);
                        } catch {
                          setSpriteError("not valid JSON yet");
                        }
                      }}
                    />
                  )}
                </Field>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(draft.art.locked)} onChange={(e) => setArt({ locked: e.target.checked })} />
                  Show as a locked silhouette
                </label>
              </>
            )}
          </Section>

          <Section title="NFT artwork">
            <ImageUpload
              label="Artwork for the NFT"
              value={draft.imageUrl}
              folder={draft.id ? `characters/${draft.id}` : null}
              session={session}
              onUploaded={(url) => set({ imageUrl: url })}
              onClear={() => set({ imageUrl: null })}
              hint="The image wallets and marketplaces show for this NFT (uploaded to IPFS when metadata is generated). The base art above is what Fuchey renders."
            />
          </Section>

          <Section title="Wardrobe">
            <Checks
              label="Slots this character can wear"
              options={WEARABLE_TYPES}
              value={draft.wardrobeSlots}
              onChange={(v) => set({ wardrobeSlots: v })}
            />
            <p className="admin-hint is-wide">
              {compatible.length
                ? `${compatible.length} wearable(s) list this character as compatible: ${compatible.map((w) => w.name).join(", ")}.`
                : "No wearables list this character yet — tick it under “Compatible characters” on a wearable."}
            </p>
          </Section>

          <Section
            title="Attributes"
            aside={
              <button type="button" className="ghost-button" onClick={() => set({ attributes: [...draft.attributes, { trait_type: "", value: "" }] })}>
                <Plus size={15} /> Add
              </button>
            }>
            {draft.attributes.map((a, i) => (
              <div key={i} className="admin-attr is-wide">
                <input aria-label="Trait" placeholder="Trait" value={a.trait_type} onChange={(e) => setAttr(i, { trait_type: e.target.value })} />
                <input aria-label="Value" placeholder="Value" value={a.value} onChange={(e) => setAttr(i, { value: e.target.value })} />
                <button type="button" className="icon-button" aria-label="Remove attribute" onClick={() => set({ attributes: draft.attributes.filter((_, j) => j !== i) })}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </Section>

          <Section title="Listing">
            <Select label="Status" value={draft.listing.status} options={STATUSES} onChange={(v) => setListing({ status: v })} errors={errors} path="status" />
            <NumberInput label="Price (SOL)" value={draft.listing.price} onChange={(v) => setListing({ price: v })} min="0" errors={errors} path="price" hint="0 = free claim." />
            <NumberInput label="Supply" value={draft.listing.supply} onChange={(v) => setListing({ supply: v })} step="1" min="1" errors={errors} path="supply" />
            <NumberInput label="Limit per wallet" value={draft.listing.limitPerWallet} onChange={(v) => setListing({ limitPerWallet: v })} step="1" min="1" errors={errors} path="limit_per_wallet" />
            <NumberInput label="Sort order" value={draft.sortOrder} onChange={(v) => set({ sortOrder: v ?? 0 })} step="1" errors={errors} path="sort_order" />
          </Section>

          <NftFields kind="character" id={saved.id} isNew={!saved.id} dirty={dirty} session={session} />
        </div>

        <aside className="admin-preview" aria-label="Preview">
          <div className={`admin-stage character-stage stage-${draft.edition}`}>
            {(draft.art.kind === "sprite" ? draft.art.sprite?.rows?.length : draft.art.image) ? (
              <ItemArt art={draft.art} alt={draft.name} itemId={draft.id} size="lg" />
            ) : (
              <p className="admin-hint">Upload base art to preview.</p>
            )}
            <span className="stage-floor" aria-hidden="true" />
          </div>
        </aside>
      </div>

      <div className="admin-actions">
        <SaveError message={status.error} errors={errors} />
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

export default CharacterEditor;
