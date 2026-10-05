import { useMemo } from "react";
import yetiUrl from "../../assets/yeti.png";
import cyberUrl from "../../assets/cyber-yeti.png";
import { CHARACTER_VIEW, stackLayers } from "../../render/visual";
import WearableLayer from "./WearableLayer";

// Base art bundled with the site; any other value is an uploaded image URL.
const BUILT_IN = { yeti: yetiUrl, cyber: cyberUrl };

// Renders a character with equipped wearables layered pixel-perfectly:
// every wearable's back layer, then the base art, then every front layer,
// each stacked by wardrobe layer. Purely visual: what's equipped is app
// state, never written into the NFT.
function CharacterRender({ image, characterId, equipped = [], alt, className = "" }) {
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
      <image
        href={BUILT_IN[image] ?? image}
        x="0"
        y="0"
        width="96"
        height="96"
        style={{ imageRendering: "pixelated" }}
      />
      {layers.map(({ wearable, visual }) => (
        <WearableLayer key={wearable.id} visual={visual} side="front" className="wear-layer" />
      ))}
    </svg>
  );
}

export default CharacterRender;
