import { useMemo } from "react";
import yetiUrl from "../../assets/yeti.png";
import cyberUrl from "../../assets/cyber-yeti.png";
import { SLOT_ORDER, wearableArt } from "../../data/wearableArt";
import { PixelRuns } from "../wardrobe/WearableIcon";

const CHARACTER_IMAGES = { yeti: yetiUrl, cyber: cyberUrl };

// Base characters are 96×96 pixel art; wearables are drawn on that same grid
// (see data/wearableArt.js). The view box adds headroom for hats and halos.
const VIEW = "-14 -19 116 116";

// Renders a character with equipped wearables layered pixel-perfectly.
// Purely visual: what's equipped is app state, never written into the NFT.
function CharacterRender({ image, equipped = [], alt, className = "" }) {
  const layers = useMemo(
    () =>
      [...equipped]
        .filter((w) => wearableArt[w.id])
        .sort((a, b) => SLOT_ORDER.indexOf(a.type) - SLOT_ORDER.indexOf(b.type)),
    [equipped],
  );

  return (
    <svg
      className={`character-render ${className}`}
      viewBox={VIEW}
      role="img"
      aria-label={alt}
      shapeRendering="crispEdges">
      {layers.map((w) =>
        wearableArt[w.id].back ? <PixelRuns key={`b-${w.id}`} runs={wearableArt[w.id].back} /> : null,
      )}
      <image
        href={CHARACTER_IMAGES[image]}
        x="0"
        y="0"
        width="96"
        height="96"
        style={{ imageRendering: "pixelated" }}
      />
      {layers.map((w) => (
        <PixelRuns key={w.id} runs={wearableArt[w.id].front} className="wear-layer" />
      ))}
    </svg>
  );
}

export default CharacterRender;
