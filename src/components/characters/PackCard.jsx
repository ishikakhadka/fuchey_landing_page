import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import ItemArt from "../marketplace/ItemArt";
import WearableIcon from "../wardrobe/WearableIcon";

// One pack on a pack grid: a line-up of a few of its items, what's in it, and
// a link into the pack. Characters and wardrobe packs share the card;
// `kind` picks the art and where the link goes.
const KINDS = {
  characters: { noun: ["character", "characters"], to: (id) => `/characters/packs/${id}` },
  wearables: { noun: ["piece", "pieces"], to: (id) => `/wardrobe/packs/${id}` },
};

function PackCard({ pack, kind = "characters", ownedCount = 0 }) {
  const { noun, to } = KINDS[kind];
  const total = pack.items.length;
  const available = pack.items.filter((item) => item.listing.status === "available").length;
  const lineup = pack.items.slice(0, kind === "wearables" ? 4 : 3);
  const copy = (kind === "wearables" && pack.wardrobe) || pack;

  return (
    <article className="pack-card">
      <div className={`pack-stage pack-stage-${pack.id}`}>
        <span className="stage-chip">
          {total} {noun[total === 1 ? 0 : 1]}
        </span>
        {ownedCount > 0 && (
          <span className="stage-chip is-owned">
            <Check size={12} strokeWidth={3} /> {ownedCount} owned
          </span>
        )}

        {kind === "wearables" ? (
          <div className="pack-rack">
            {lineup.map((w) => (
              <span key={w.id} className="pack-rack-item">
                <WearableIcon id={w.id} />
              </span>
            ))}
          </div>
        ) : (
          <div className="pack-lineup" data-count={lineup.length}>
            {lineup.map((c) => (
              <ItemArt key={c.id} art={c.art} alt={c.title} itemId={c.id} size="md" />
            ))}
          </div>
        )}
        <span className="stage-floor" aria-hidden="true" />
      </div>

      <div className="pack-card-body">
        <h3>
          <Link to={to(pack.id)} className="card-link">
            {pack.name}
          </Link>
        </h3>
        <p className="pack-card-tagline">{copy.tagline}</p>
        <p className="pack-card-description">{copy.description}</p>
        <div className="pack-card-foot">
          <span className="pack-card-count">{available ? `${available} available now` : "Coming soon"}</span>
          <span className="pack-card-cta" aria-hidden="true">
            Explore <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}

export default PackCard;
