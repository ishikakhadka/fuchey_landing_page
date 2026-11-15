import { useRef } from "react";
import { useEdition } from "../../context/EditionContext";
import { useContent } from "../../context/ContentContext";
import { useStoredState } from "../../hooks/useStoredState";

import HeroCarousel from "../../components/home/HeroCarousel.jsx";
import { CastParade, HowItWorks, OnSaleNow, StatsStrip, UpcomingDrops } from "../../components/home/HomeSections.jsx";
import CharacterDiscovery from "../../components/experience/CharacterDiscovery.jsx";
import CompanionSection from "../../components/experience/CompanionSection.jsx";
import Waitlist from "../../components/Waitlist.jsx";
import "../../home.css";

// The home page. The hero carousel and Upcoming Drops come from the admin
// (Drops + Home tabs), and so does which sections show. `revealed` is shared:
// a character revealed anywhere on the page (scratch card or capsules) is
// revealed everywhere, and it's remembered for this session.
function Home() {
  const { current, setEdition } = useEdition();
  const { settings } = useContent();
  const on = settings.sections;
  const discovery = useRef(null);
  const [revealed, setRevealed] = useStoredState("fuchey:home:revealed", []);
  const markRevealed = (id) => setRevealed((ids) => (ids.includes(id) ? ids : [...ids, id]));

  return (
    <div className="xp-home hm-home">
      <HeroCarousel revealedIds={revealed} onCardReveal={markRevealed} />
      {on.stats && <StatsStrip />}
      {on.parade && <CastParade />}
      {on.reveal && <CharacterDiscovery ref={discovery} revealed={revealed} setRevealed={setRevealed} />}
      {on.howItWorks && <HowItWorks />}
      {on.upcoming && <UpcomingDrops />}
      {on.onSale && <OnSaleNow />}
      {on.companion && <CompanionSection edition={current.id} onEditionChange={setEdition} />}
      {on.waitlist && <Waitlist edition={current} />}
    </div>
  );
}

export default Home;
