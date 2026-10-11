import { useMemo } from "react";
import { spriteRuns } from "../../render/visual";

// Renders a data/sprites.js grid as crisp SVG. Horizontal runs of the same
// colour are merged into one <rect> to keep the DOM small.
function PixelSprite({ sprite, silhouette = false, className = "", title }) {
  const rects = useMemo(() => spriteRuns(sprite), [sprite]);

  const width = sprite.rows[0].length;
  const height = sprite.rows.length;

  return (
    <svg
      className={`pixel-sprite ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}>
      {rects.map(({ x, y, w, key }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={1}
          fill={silhouette ? "currentColor" : sprite.palette[key]}
        />
      ))}
    </svg>
  );
}

export default PixelSprite;
