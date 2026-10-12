import { useRef } from "react";
import { useEdition } from "../../context/EditionContext";
import { useStoredState } from "../../hooks/useStoredState";

import ExperienceHero from "../../components/experience/ExperienceHero.jsx";
import CharacterDiscovery from "../../components/experience/CharacterDiscovery.jsx";
import CompleteTheLook from "../../components/experience/CompleteTheLook.jsx";
import CompanionSection from "../../components/experience/CompanionSection.jsx";
import Waitlist from "../../components/Waitlist.jsx";

// Characters first (a scratch card, then sealed capsules), then dressing the
// ones you've revealed, then the device that takes them off the screen, then
// the waitlist. `revealed` is shared: a character revealed anywhere is revealed
// everywhere on the page, and it's remembered in this browser, so nothing
// seals itself again when the visitor leaves and comes back.
function Home() {
  const { current } = useEdition();
  const discovery = useRef(null);
  const [revealed, setRevealed] = useStoredState("fuchey:home:revealed", []);
  const revealOne = () => discovery.current?.reveal();
  const markRevealed = (id) => setRevealed((ids) => (ids.includes(id) ? ids : [...ids, id]));

  return (
    <div className="xp-home">
      <ExperienceHero revealedIds={revealed} onCardReveal={markRevealed} />

      <CharacterDiscovery ref={discovery} revealed={revealed} setRevealed={setRevealed} />

      <CompleteTheLook unlocked={revealed} onRevealMore={revealOne} />

      <CompanionSection edition={current.id} />

      <Waitlist edition={current} />
    </div>
  );
}

export default Home;
