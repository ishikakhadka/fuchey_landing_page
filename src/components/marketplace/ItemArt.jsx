import PixelSprite from "./PixelSprite";
import CharacterRender from "../characters/CharacterRender";
import WearableIcon from "../wardrobe/WearableIcon";
import { variesByCharacter } from "../../render/visual";

// Artwork for any catalogue item:
//   character → base art + optional `equipped` wearables, layered on one grid
//   vector    → smooth vector art (Cartoon pack), dressed the same way
//   wearable  → the wearable's own pixel art
//   sprite    → placeholder art (e.g. locked, unreleased characters)
// `item` lets callers draw an item that isn't in the published catalogue yet
// (admin preview); normally it's looked up by `itemId`.
// `forCharacter`: for a wearable, the character being browsed, so the card
// shows that character's own version of it (see WearableIcon).
function ItemArt({ art, alt, itemId, item, equipped = [], size = "md", forCharacter = null }) {
  const locked = Boolean(art.locked);
  // One shared picture (NFT artwork or GIF) can't stand for a wearable that is
  // drawn differently per character while a character is being browsed.
  const sharedPicture = art.displayImage && !(art.kind === "wearable" && forCharacter && variesByCharacter(item));

  let content;
  if (sharedPicture && !equipped.length) {
    // The NFT artwork, when the admin chose to show it on the site.
    content = <img className="item-art-display" src={art.displayImage} alt={alt} />;
  } else if (art.kind === "character" || art.kind === "vector") {
    content = <CharacterRender art={art} characterId={itemId} equipped={equipped} alt={alt} />;
  } else if (art.kind === "wearable") {
    content = <WearableIcon id={itemId} wearable={item} characterId={forCharacter} alt={alt} />;
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
