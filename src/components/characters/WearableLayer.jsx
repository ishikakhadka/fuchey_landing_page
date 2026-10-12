// One side ("front" | "back" | "icon") of a wearable's visual, as SVG in the
// character's 96×96 grid. Used by CharacterRender and WearableIcon, so a
// wearable looks the same on a card, in the wardrobe and in the admin preview.

import VectorShapes from "./VectorShapes";

// Horizontal pixel runs as SVG rects.
export function PixelRuns({ runs, className }) {
  return (
    <g className={className}>
      {runs.map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </g>
  );
}

function WearableLayer({ visual, side = "front", className }) {
  if (visual.kind === "image") {
    const href = side === "back" ? visual.backImage : side === "front" ? visual.image : null;
    if (!href) return null;
    const scale = visual.scale ?? 1;
    return (
      <image
        className={className}
        href={href}
        x={visual.x ?? 0}
        y={visual.y ?? 0}
        width={(visual.width ?? 96) * scale}
        height={(visual.height ?? 96) * scale}
        preserveAspectRatio="none"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

  // Vector shapes are drawn in grid coordinates; x / y shift them as a whole.
  if (visual.kind === "vector") {
    const shapes = visual[side];
    if (!shapes?.length) return null;
    const { x = 0, y = 0 } = visual;
    return (
      <g transform={x || y ? `translate(${x} ${y})` : undefined}>
        <VectorShapes shapes={shapes} className={className} />
      </g>
    );
  }

  // Pixel runs are drawn in grid coordinates, or finer: `res` pixels per
  // grid unit (pack gear is drawn at res 2). x / y shift them as a whole.
  const runs = visual[side];
  if (!runs?.length) return null;
  const { x = 0, y = 0, res = 1 } = visual;
  const transform = [x || y ? `translate(${x} ${y})` : "", res !== 1 ? `scale(${1 / res})` : ""].join(" ").trim();
  return (
    <g transform={transform || undefined}>
      <PixelRuns runs={runs} className={className} />
    </g>
  );
}

export default WearableLayer;
