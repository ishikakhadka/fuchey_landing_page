import { Link } from "react-router";

import Countdown from "./Countdown";
import CrewLineup from "./CrewLineup";
import { useCatalog } from "../../context/CatalogContext";
import { getPack } from "../../data/packs";
import { getRarity } from "../../services/marketplace/catalog";
import { backdropFor, dropTiming, DROP_PHASE } from "../../utils/drops";

// A hero slide for a pack drop. Everything comes from the drop (admin):
// backdrop scene, headline, copy, countdown to its start or end, and the
// drop's characters taking turns in the middle of the stage.
function DropSlide({ drop, now }) {
  const { characters, wearables } = useCatalog();
  const pack = getPack(drop.pack);
  const crew = drop.characterIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean);
  const packWearables = wearables.filter((w) => getPack(w.pack).id === pack.id).length;
  const packCharacters = characters.filter((c) => getPack(c.pack).id === pack.id);
  const top = packCharacters.reduce((best, c) => (getRarity(c.rarity).rank > getRarity(best).rank ? c.rarity : best), "common");
  const timing = dropTiming(drop, now);
  const headline = drop.headline || "Something’s on";
  const accent = drop.headlineAccent || (drop.headline ? "" : "the horizon.");
  const ctaHref = drop.ctaHref || "#waitlist";

  return (
    <div className="hm-slide hm-slide-drop">
      <div className="hm-slide-bg" aria-hidden="true">
        <img src={backdropFor(drop)} alt="" className="hm-scene" />
        <span className="hm-scene-shade" />
        <span className="tx-dots fade-soft" style={{ left: "-6%", top: "15%", width: "55%", height: "90%" }} />
        <span className="sh-arc" style={{ left: "36%", top: "15%", width: 220, height: 220 }} />
        <span className="sh-plus" style={{ left: "42%", top: "22%" }} />
        <span className="sh-plus is-orange" style={{ left: "49%", top: "64%", animationDelay: "1s" }} />
        <span className="sh-plus" style={{ right: "6%", top: "18%", animationDelay: "2s" }} />
      </div>

      <div className="hm-slide-copy">
        <span className="hm-pill-tag">
          <span className="hm-dot" aria-hidden="true" />
          {drop.label || "Next drop"} · {pack.name}
        </span>
        <h1 className="hm-title">
          <span>{headline}</span>
          {accent && <span className="accent">{accent}</span>}
        </h1>
        {drop.description && <p className="hm-lede">{drop.description}</p>}
        {timing.target ? (
          <div className="hm-timing">
            <span className="hm-timing-label">{timing.phase === DROP_PHASE.UPCOMING ? "Drops in" : "Ends in"}</span>
            <Countdown target={timing.target} now={now} />
          </div>
        ) : (
          <p className="hm-timing-label is-solo">{timing.text}</p>
        )}
        <div className="hm-actions">
          {ctaHref.startsWith("/") ? (
            <Link to={ctaHref} className="hm-btn is-primary">{drop.ctaLabel || "Get Drop Alerts"}</Link>
          ) : (
            <a href={ctaHref} className="hm-btn is-primary">{drop.ctaLabel || "Get Drop Alerts"}</a>
          )}
          <Link to={`/characters/packs/${pack.id}`} className="hm-btn is-ghost">
            Meet the Crew →
          </Link>
        </div>
      </div>

      {crew.length > 0 && (
        <div className="hm-slide-stage">
          <CrewLineup characters={crew} />
          <div className="hm-drop-card">
            <span>In this drop</span>
            <b>
              {packCharacters.length} characters · {packWearables} wearables
            </b>
            <small>Up to {getRarity(top).label}</small>
          </div>
        </div>
      )}
    </div>
  );
}

export default DropSlide;
