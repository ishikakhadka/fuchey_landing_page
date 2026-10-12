// Vector art: a list of shapes { d, fill, stroke, sw, op } drawn as SVG
// paths on the character's 96×96 grid. Used by the Cartoon pack, whose
// characters and wardrobe are drawn smooth rather than in pixels.
//
// The SVGs these sit in render crisp pixel edges; vector art opts back into
// anti-aliasing so its curves stay smooth.
function VectorShapes({ shapes, className }) {
  return (
    <g className={className} shapeRendering="geometricPrecision" strokeLinejoin="round" strokeLinecap="round">
      {shapes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={s.fill ?? "none"}
          stroke={s.stroke}
          strokeWidth={s.stroke ? (s.sw ?? 1) : undefined}
          opacity={s.op}
        />
      ))}
    </g>
  );
}

export default VectorShapes;
