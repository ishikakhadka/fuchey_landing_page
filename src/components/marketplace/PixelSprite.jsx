import { useMemo } from "react";

// Renders a data/sprites.js grid as crisp SVG. Horizontal runs of the same
// colour are merged into one <rect> to keep the DOM small.
function PixelSprite({ sprite, silhouette = false, className = "", title }) {
  const rects = useMemo(() => {
    const out = [];

    sprite.rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const key = row[x];
        let end = x + 1;
        while (end < row.length && row[end] === key) end++;
        if (key !== ".") out.push({ x, y, w: end - x, key });
        x = end;
      }
    });

    return out;
  }, [sprite]);

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
