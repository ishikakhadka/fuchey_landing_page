import { editions } from "../data/editions";
import "../index.css";

function Navbar({ edition, setEdition }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a href="#" className="logo">
          <span>F</span>
          <strong>fuchey</strong>
        </a>

        <nav>
          <a href="#editions">Editions</a>
          <a href="#features">Features</a>
          <a href="#waitlist">Waitlist</a>
        </nav>

        <div className="edition-toggle">
          {Object.values(editions).map((item) => (
            <button
              key={item.id}
              className={edition === item.id ? "active" : ""}
              onClick={() => setEdition(item.id)}>
              {item.icon}
              <span>{item.label.replace(" Edition", "")}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
