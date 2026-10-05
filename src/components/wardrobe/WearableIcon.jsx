import { wearableArt } from "../../data/wearableArt";

// Horizontal pixel runs from data/wearableArt.js as SVG rects.
export function PixelRuns({ runs, className }) {
  return (
    <g className={className}>
      {runs.map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </g>
  );
}

// A wearable on its own: its icon layer, or its on-character layers, cropped
// to their bounds.
function WearableIcon({ id, alt, className = "" }) {
  const art = wearableArt[id];
  if (!art) return null;

  const { x, y, w, h } = art.bounds;
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
      {art.icon ? (
        <PixelRuns runs={art.icon} />
      ) : (
        <>
          {art.back && <PixelRuns runs={art.back} />}
          <PixelRuns runs={art.front} />
        </>
      )}
    </svg>
  );
}

export default WearableIcon;
