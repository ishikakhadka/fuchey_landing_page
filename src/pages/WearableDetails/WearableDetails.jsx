import { Link, useParams } from "react-router";
import { ArrowLeft, Check, Shirt } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import CharacterRender from "../../components/characters/CharacterRender";
import RarityBadge from "../../components/marketplace/RarityBadge";
import AvailabilityBadge from "../../components/marketplace/AvailabilityBadge";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import ListingPanel from "../../components/details/ListingPanel";
import OnChainRecord from "../../components/details/OnChainRecord";

import { useCatalog } from "../../context/CatalogContext";
import { useCollection } from "../../hooks/useCollection";
import { getPack } from "../../data/packs";
import { fitsCharacter, getWearableTypeLabel, isDressable } from "../../services/marketplace/catalog";
import { artTransitionName } from "../../utils/routes";

// /wearables/:id — one wearable, and how it looks on every character it fits
// (drawn by the same layered renderer as the fitting room).
function WearableDetails() {
  const { id } = useParams();
  const { wearables, characters, loading, error } = useCatalog();
  const { ownsWearable } = useCollection();
  const wearable = wearables.find((w) => w.id === id);

  if (loading) {
    return (
      <div className="container market-page character-details" aria-busy="true">
        <span className="skeleton-line" style={{ width: 120 }} />
        <div className="details-grid">
          <div className="details-stage skeleton-block" />
          <div className="details-info">
            <span className="skeleton-line" style={{ width: "35%" }} />
            <span className="skeleton-line is-xl" style={{ width: "70%" }} />
            <span className="skeleton-line" />
            <span className="skeleton-block" style={{ height: 220, borderRadius: 20 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!wearable) {
    return (
      <div className="container market-page">
        <EmptyState
          title={error ? "Couldn’t load this wearable." : "This piece isn’t on the rack."}
          action={
            <Link to="/marketplace?kind=wearables" className="ghost-button">
              <ArrowLeft size={16} /> All wearables
            </Link>
          }>
          {error ? "The catalogue didn’t load. Try refreshing in a moment." : `We couldn’t find a wearable called “${id}”.`}
        </EmptyState>
      </div>
    );
  }

  const pack = getPack(wearable.pack);
  const owned = ownsWearable(wearable.id);
  const fits = characters.filter((c) => fitsCharacter(wearable, c.id));

  return (
    <div className="container market-page character-details">
      <Link to="/marketplace?kind=wearables" className="back-link" viewTransition>
        <ArrowLeft size={16} strokeWidth={2.2} /> Wearables
      </Link>

      <div className="details-grid">
        <div className="details-visual">
          <div
            className="details-stage character-stage stage-companion is-wearable"
            style={{ viewTransitionName: artTransitionName(wearable, "wearable") }}>
            <span className="stage-chip">{getWearableTypeLabel(wearable.type)}</span>
            {owned && (
              <span className="stage-chip is-owned">
                <Check size={12} strokeWidth={3} /> Owned
              </span>
            )}
            <div className="xp-idle">
              <ItemArt art={wearable.art} alt={wearable.name} itemId={wearable.id} item={wearable} size="lg" />
            </div>
            <span className="stage-floor" aria-hidden="true" />
          </div>
        </div>

        <div className="details-info">
          <div className="details-kicker">
            <span className="details-pack">
              <Link to={`/wardrobe/packs/${pack.id}`}>{pack.name}</Link>
            </span>
            <RarityBadge rarity={wearable.rarity} />
            <AvailabilityBadge item={wearable} />
            <NetworkBadge />
          </div>

          <h1>{wearable.name}</h1>
          <p className="details-tagline">
            {getWearableTypeLabel(wearable.type)} · fits {fits.length ? fits.map((c) => c.name).join(", ") : "no character yet"}
          </p>
          {wearable.description && <p className="details-desc">{wearable.description}</p>}

          <ListingPanel item={wearable} />
        </div>
      </div>

      {fits.length > 0 && (
        <section className="details-wearables">
          <div className="row-heading">
            <div>
              <h2 className="details-heading">On the characters it fits</h2>
              <p className="muted">How {wearable.name} looks on each compatible character.</p>
            </div>
            <Link to={`/wardrobe?item=${wearable.id}`} className="ghost-button">
              <Shirt size={16} /> Try it on
            </Link>
          </div>

          <ul className="fits-grid">
            {fits.map((c) => (
              <li key={c.id}>
                <Link to={`/characters/${c.id}`} className="fits-card" viewTransition>
                  <span className={`fits-stage character-stage stage-${c.edition}`}>
                    {isDressable(c) ? (
                      <CharacterRender
                        art={c.art}
                        characterId={c.id}
                        equipped={[wearable]}
                        alt={`${c.name} wearing ${wearable.name}`}
                      />
                    ) : (
                      <ItemArt art={c.art} alt={c.name} itemId={c.id} size="md" />
                    )}
                  </span>
                  <span className="fits-name">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="details-sections is-single">
        <OnChainRecord item={wearable} />
      </div>
    </div>
  );
}

export default WearableDetails;
