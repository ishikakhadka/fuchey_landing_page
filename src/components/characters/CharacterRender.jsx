import { useMemo } from "react";
import yetiUrl from "../../assets/yeti.png";
import { CHARACTER_VIEW, spriteRuns, stackLayers } from "../../render/visual";
import VectorShapes from "./VectorShapes";
import WearableLayer from "./WearableLayer";

// Base art bundled with the site; any other value is an uploaded image URL.
const BUILT_IN = { yeti: yetiUrl };

// A pixel sprite scaled to fill the 96×96 grid, like the base images.
function SpriteBase({ sprite }) {
  const runs = useMemo(() => spriteRuns(sprite), [sprite]);
  const k = 96 / sprite.rows[0].length;
  return (
    <g transform={`scale(${k})`}>
      {runs.map(({ x, y, w, key }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={sprite.palette[key]} />
      ))}
    </g>
  );
}

// Renders a character with equipped wearables layered pixel-perfectly:
// every wearable's back layer, then the base art, then every front layer,
// each stacked by wardrobe layer. `art` is the character's base art: an image
// ({ kind: "character", image }), a pixel sprite ({ kind: "sprite", sprite }) or
// vector shapes ({ kind: "vector", shapes }).
// Purely visual: what's equipped is app state, never written into the NFT.
function CharacterRender({ art, characterId, equipped = [], alt, className = "" }) {
  const layers = useMemo(() => stackLayers(equipped, characterId), [equipped, characterId]);

  return (
    <svg
      className={`character-render ${className}`}
      viewBox={CHARACTER_VIEW}
      role="img"
      aria-label={alt}
      shapeRendering="crispEdges">
      {layers.map(({ wearable, visual }) => (
        <WearableLayer key={`b-${wearable.id}`} visual={visual} side="back" />
      ))}
      {art.kind === "sprite" ? (
        <SpriteBase sprite={art.sprite} />
      ) : art.kind === "vector" ? (
        <VectorShapes shapes={art.shapes} />
      ) : (
        <image
          href={BUILT_IN[art.image] ?? art.image}
          x="0"
          y="0"
          width="96"
          height="96"
          style={{ imageRendering: "pixelated" }}
        />
      )}
      {layers.map(({ wearable, visual }) => (
        <WearableLayer key={wearable.id} visual={visual} side="front" className="wear-layer" />
      ))}
    </svg>
  );
}

export default CharacterRender;
