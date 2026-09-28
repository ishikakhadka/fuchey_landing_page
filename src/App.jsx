import { useState } from "react";
import { editions } from "./data/editions";

import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Marquee from "./components/Marquee.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import EditionSwitcher from "./components/EditionSwitcher.jsx";
import Features from "./components/Features.jsx";
import Ecosystem from "./components/Ecosystem.jsx";
import Waitlist from "./components/Waitlist.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [edition, setEdition] = useState("dev");

  const currentEdition = editions[edition];

  return (
    <div className={`app theme-${edition}`}>
      <Navbar edition={edition} setEdition={setEdition} />

      <main>
        <Hero edition={currentEdition} />

        <Marquee edition={currentEdition} />

        <HowItWorks />

        <EditionSwitcher edition={edition} setEdition={setEdition} />

        <Features edition={currentEdition} />

        <Ecosystem />

        <Waitlist edition={currentEdition} />
      </main>

      <Footer />
    </div>
  );
}

export default App;
