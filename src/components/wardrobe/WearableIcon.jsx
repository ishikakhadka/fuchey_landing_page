import { useCatalog } from "../../context/CatalogContext";
import { visualBounds } from "../../render/visual";
import WearableLayer from "../characters/WearableLayer";

// A wearable on its own: its icon layer, or its on-character layers, cropped
// to their bounds. Pass `wearable` to draw one that isn't in the published
// catalogue (the admin preview); otherwise it's looked up by `id`.
function WearableIcon({ id, wearable, alt, className = "" }) {
  const { wearables } = useCatalog();
  const item = wearable ?? wearables.find((w) => w.id === id);
  const visual = item?.visual;
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
