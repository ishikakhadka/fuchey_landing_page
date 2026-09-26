import { editions } from "../data/editions";
import { Bot, Smile } from "lucide-react";
import "../index.css";

const editionIcons = {
  dev: Bot,
  companion: Smile,
};

function Navbar({ edition, setEdition }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a href="#" className="logo">
          <img src="fuchey_logo.png" alt="Fuchey Logo" />
        </a>

        <nav>
          <a href="#editions">Editions</a>
          <a href="#features">Features</a>
          <a href="#waitlist">Waitlist</a>
        </nav>

        <div className="edition-toggle">
          {Object.values(editions).map((item) => {
            const Icon = editionIcons[item.id];

            return (
              <button
                key={item.id}
                className={edition === item.id ? "active" : ""}
                onClick={() => setEdition(item.id)}
                style={{ gap: "8px" }}>
                <Icon size={16} strokeWidth={1.8} />
                <span>{item.label.replace(" Edition", "")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
