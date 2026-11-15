import ItemArt from "../marketplace/ItemArt";
import RarityBadge from "../marketplace/RarityBadge";

// A drop's characters sealed together in one glass capsule on a lit
// platform. Sealed, they show as glowing silhouettes; revealing lifts the cap
// and brings all of them back at once. Purely a preview: nothing is minted.
//
// Layout: the middle character stands tallest at the front, the rest flank it.
function CrewCapsule({ characters, open, onOpen }) {
  const order = arrange(characters);
  return (
    <div className={`hm-capsule ${open ? "is-open" : "is-sealed"} count-${order.length}`}>
      <span className="hm-plat-glow" aria-hidden="true" />
      <span className="hm-plat" aria-hidden="true" />
      <span className="hm-plat-ring" aria-hidden="true" />
      <span className="hm-plat-core" aria-hidden="true" />

      <div className="hm-crew">
        {order.map(({ character, slot }) => (
          <figure key={character.id} className={`hm-crewmate slot-${slot}`}>
            <ItemArt art={character.art} alt={open ? character.title ?? character.name : ""} itemId={character.id} size="lg" />
            {open && (
              <figcaption>
                {character.name} <RarityBadge rarity={character.rarity} />
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <span className="hm-glass" aria-hidden="true">
        <span className="hm-glass-lid" />
        <span className="hm-glass-shine" />
      </span>

      {open && <span className="hm-burst" aria-hidden="true" />}

      {!open && (
        <button type="button" className="hm-capsule-hit" onClick={onOpen}>
          <span className="hm-capsule-tag">
            {characters.length} {characters.length === 1 ? "character" : "crewmates"} sealed inside · tap to reveal
          </span>
        </button>
      )}
    </div>
  );
}

// [a, b, c] → b in front-centre, a left, c right (and so on outwards).
function arrange(list) {
  if (list.length <= 1) return list.map((character) => ({ character, slot: "center" }));
  const mid = Math.floor((list.length - 1) / 2);
  return list.map((character, i) => ({
    character,
    slot: i === mid ? "center" : i < mid ? `left-${mid - i}` : `right-${i - mid}`,
  }));
}

export default CrewCapsule;
