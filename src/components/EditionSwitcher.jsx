import "../index.css";
import { editions } from "../data/editions";

function EditionSwitcher({ edition, setEdition }) {
  return (
    <section className="edition-switcher">
      <div className="container">
        <p className="section-label">
          ONE FUCHEY. TWO WAYS TO EXPERIENCE SOLANA.
        </p>

        <div className="edition-buttons">
          {Object.values(editions).map((item) => (
            <button
              key={item.id}
              className={edition === item.id ? "selected" : ""}
              onClick={() => setEdition(item.id)}>
              <span className="edition-icon">{item.icon}</span>

              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EditionSwitcher;
