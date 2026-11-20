import { useCatalog } from "../../context/CatalogContext";
import { resolveVisual, visualBounds } from "../../render/visual";
import WearableLayer from "../characters/WearableLayer";

// A wearable on its own: its icon layer, or its on-character layers, cropped
// to their bounds. Pass `wearable` to draw one that isn't in the published
// catalogue (the admin preview); otherwise it's looked up by `id`.
// `characterId`: the character being browsed. The icon then shows that
// character's own version of the item (perCharacter art and placement), the
// same one CharacterRender puts on it; items shared by every character, and
// characters without a version of their own, use the shared art.
function WearableIcon({ id, wearable, characterId = null, alt, className = "" }) {
  const { wearables } = useCatalog();
  const item = wearable ?? wearables.find((w) => w.id === id);
  const visual = resolveVisual(item, characterId);
  if (!visual) return null;

  const { x, y, w, h } = visualBounds(visual);
  const side = Math.max(w, h) + 4;
  const vx = x - (side - w) / 2;
  const vy = y - (side - h) / 2;

  return (
    <svg
      className={`wearable-icon ${className}`}
      viewBox={`${vx} ${vy} ${side} ${side}`}
      shapeRendering="crispEdges"
      role={alt ? "img" : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}>
      {visual.icon ? (
        <WearableLayer visual={visual} side="icon" />
      ) : (
        <>
          <WearableLayer visual={visual} side="back" />
          <WearableLayer visual={visual} side="front" />
        </>
      )}
    </svg>
  );
}

export default WearableIcon;
