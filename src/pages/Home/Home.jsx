import { useEdition } from "../../context/EditionContext";

import Hero from "../../components/Hero.jsx";
import Marquee from "../../components/Marquee.jsx";
import HowItWorks from "../../components/HowItWorks.jsx";
import EditionSwitcher from "../../components/EditionSwitcher.jsx";
import Features from "../../components/Features.jsx";
import Ecosystem from "../../components/Ecosystem.jsx";
import Waitlist from "../../components/Waitlist.jsx";

function Home() {
  const { edition, setEdition, current } = useEdition();

  return (
    <>
      <Hero edition={current} />

      <Marquee edition={current} />

      <HowItWorks />

      <EditionSwitcher edition={edition} setEdition={setEdition} />

      <Features edition={current} />

      <Ecosystem />

      <Waitlist edition={current} />
    </>
  );
}

export default Home;
