import { useState } from "react";
import { editions } from "./data/editions";

import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import EditionSwitcher from "./components/EditionSwitcher.jsx";
// import Editions from "./components/Editions.jsx";
import Features from "./components/Features.jsx";
import Waitlist from "./components/Waitlist.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [edition, setEdition] = useState("companion");

  const currentEdition = editions[edition];

  return (
    <div className={`app theme-${edition}`}>
      <Navbar edition={edition} setEdition={setEdition} />

      <main>
        <Hero edition={currentEdition} />

        <EditionSwitcher edition={edition} setEdition={setEdition} />

        {/* <Editions edition={edition} setEdition={setEdition} /> */}

        <Features edition={currentEdition} />

        <Waitlist edition={currentEdition} />
      </main>

      <Footer />
    </div>
  );
}

export default App;
