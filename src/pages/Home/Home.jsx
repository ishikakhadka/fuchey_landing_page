import { useRef, useState } from "react";
import { useEdition } from "../../context/EditionContext";

import ExperienceHero from "../../components/experience/ExperienceHero.jsx";
import CharacterDiscovery from "../../components/experience/CharacterDiscovery.jsx";
import CompleteTheLook from "../../components/experience/CompleteTheLook.jsx";
import CompanionSection from "../../components/experience/CompanionSection.jsx";
import FindYourFuchey from "../../components/experience/FindYourFuchey.jsx";
import Waitlist from "../../components/Waitlist.jsx";

// Characters first (a scratch card, then sealed capsules), then dressing the
// ones you've revealed, then the device that takes them off the screen, then
// the way in. `revealed` is shared: a character revealed anywhere is revealed
// everywhere on the page.
function Home() {
  const { current } = useEdition();
  const discovery = useRef(null);
  const [revealed, setRevealed] = useState([]);
  const revealOne = () => discovery.current?.reveal();
  const markRevealed = (id) => setRevealed((ids) => (ids.includes(id) ? ids : [...ids, id]));

  return (
    <div className="xp-home">
      <ExperienceHero onReveal={revealOne} revealedIds={revealed} onCardReveal={markRevealed} />

      <CharacterDiscovery ref={discovery} revealed={revealed} setRevealed={setRevealed} />

      <CompleteTheLook unlocked={revealed} onRevealMore={revealOne} />

      <CompanionSection edition={current.id} />

      <FindYourFuchey />

      <Waitlist edition={current} />
    </div>
  );
}

export default Home;
