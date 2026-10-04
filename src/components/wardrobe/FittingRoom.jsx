import { X } from "lucide-react";

import CharacterRender from "../characters/CharacterRender";
import RarityBadge from "../marketplace/RarityBadge";
import PriceTag from "../marketplace/PriceTag";
import PurchaseButton from "../marketplace/PurchaseButton";
import { getWearableTypes } from "../../services/marketplace/catalog";

// Live try-on: the chosen character wearing whatever is selected, plus the
// focused item's details and Buy / Claim button. Trying things on is purely
// visual — it doesn't need, or change, any NFT.
function FittingRoom({ characters, character, onCharacter, worn, onRemove, focused, ownedCount }) {
  const types = getWearableTypes();
  const typeLabel = (id) => types.find((t) => t.id === id)?.label ?? id;

  return (
    <aside className="fitting-room" aria-label="Fitting room">
      <div className={`fitting-stage character-stage stage-${character.edition}`}>
        <div className="fitting-switch" role="group" aria-label="Character">
          {characters.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === character.id}
              onClick={() => onCharacter(c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        <CharacterRender
          image={character.art.image}
          equipped={worn}
          alt={`${character.name} wearing ${worn.map((w) => w.name).join(", ") || "nothing extra"}`}
          className="fitting-render"
        />
        <span className="stage-floor" aria-hidden="true" />
      </div>

      <ul className="fitting-worn" aria-label="Wearing">
        {worn.length === 0 && <li className="muted">Tap an item to try it on.</li>}
        {worn.map((w) => (
          <li key={w.id}>
            <span>{w.name}</span>
            <button type="button" aria-label={`Take off ${w.name}`} onClick={() => onRemove(w)}>
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>

      {focused && (
        <div className="fitting-detail" key={focused.id}>
          <div className="fitting-detail-head">
            <div>
              <p className="wearable-type">{typeLabel(focused.type)}</p>
              <h2>{focused.name}</h2>
            </div>
            <PriceTag listing={focused.listing} />
          </div>
          <RarityBadge rarity={focused.rarity} />
          <p className="fitting-desc">{focused.description}</p>
          {ownedCount > 0 && <p className="fitting-owned">You own {ownedCount}.</p>}
          <PurchaseButton item={focused} size="lg" />
        </div>
      )}
    </aside>
  );
}

export default FittingRoom;
