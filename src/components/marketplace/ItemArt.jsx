import PixelSprite from "./PixelSprite";
import CharacterRender from "../characters/CharacterRender";
import WearableIcon from "../wardrobe/WearableIcon";

// Artwork for any catalogue item:
//   character → base art + optional `equipped` wearables, layered on one grid
//   wearable  → the wearable's own pixel art
//   sprite    → placeholder art (e.g. locked, unreleased characters)
// `item` lets callers draw an item that isn't in the published catalogue yet
// (admin preview); normally it's looked up by `itemId`.
function ItemArt({ art, alt, itemId, item, equipped = [], size = "md" }) {
  const locked = Boolean(art.locked);

  let content;
  if (art.kind === "character") {
    content = <CharacterRender image={art.image} characterId={itemId} equipped={equipped} alt={alt} />;
  } else if (art.kind === "wearable") {
    content = <WearableIcon id={itemId} wearable={item} alt={alt} />;
  } else {
    content = (
      <PixelSprite
        sprite={art.sprite}
        silhouette={locked}
        className="item-art-base"
        title={locked ? `${alt} (locked)` : alt}
      />
    );
  }

  return (
    <div className={`item-art item-art-${size} item-art-${art.kind} ${locked ? "is-locked" : ""}`}>
      <div className="item-art-layers">{content}</div>

      {locked && (
        <span className="item-art-lock" aria-hidden="true">
          ?
        </span>
      )}
    </div>
  );
}

export default ItemArt;
