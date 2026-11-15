import { Link } from "react-router";
import { ArrowRight, Clock } from "lucide-react";

import ItemArt from "../marketplace/ItemArt";
import { useCatalog } from "../../context/CatalogContext";
import { useContent } from "../../context/ContentContext";
import { useNow } from "../../hooks/useNow";
import { getPack } from "../../data/packs";
import { backdropFor, dropTiming, visibleDrops } from "../../utils/drops";

// The wide drop banner (Characters, Marketplace, pack pages): the drop's
// scene, its lead character, label + title, timing and a button. Shows the
// first live drop set to "Show the drop banner" in the admin, or the one for
// `pack` when given; nothing when there's none.
function DropBanner({ pack, drop: given }) {
  const { drops } = useContent();
  const { characters } = useCatalog();
  const now = useNow();
  const live = visibleDrops(drops, now).filter((d) => d.showBanner);
  const drop = given ?? (pack ? live.find((d) => d.pack === pack) : live[0]);
  if (!drop) return null;

  const ids = drop.characterIds;
  const lead = characters.find((c) => c.id === ids[Math.floor((ids.length - 1) / 2)]);
  const timing = dropTiming(drop, now);
  const href = drop.ctaHref?.startsWith("/") ? drop.ctaHref : `/characters/packs/${getPack(drop.pack).id}`;

  return (
    <section className="drop-banner" aria-label={`${drop.title}: ${timing.text}`}>
      <img className="drop-banner-bg" src={backdropFor(drop)} alt="" />
      <span className="drop-banner-shade" aria-hidden="true" />
      <span className="drop-banner-sheen" aria-hidden="true" />
      {lead && (
        <span className="drop-banner-art">
          <ItemArt art={lead.art} alt="" itemId={lead.id} size="sm" />
        </span>
      )}
      <span className="drop-banner-text">
        <b>{drop.label || "Coming Soon"}</b>
        <span>{drop.title}</span>
      </span>
      <span className="drop-banner-time">
        <Clock size={20} aria-hidden="true" />
        {timing.text}
      </span>
      <Link to={href} className="drop-banner-cta">
        {drop.ctaLabel || "Join the Drop"} <ArrowRight size={16} />
      </Link>
    </section>
  );
}

export default DropBanner;
