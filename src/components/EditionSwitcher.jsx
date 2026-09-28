import { Check } from "lucide-react";
import { editions } from "../data/editions";

function EditionSwitcher({ edition, setEdition }) {
  return (
    <section id="editions" className="editions-section">
      <div className="container">
        <div className="section-heading reveal">
          <p className="eyebrow">TWO EDITIONS</p>
          <h2>One Fuchey. Two ways to experience Solana.</h2>
        </div>

        <div className="edition-cards">
          {Object.values(editions).map((item) => {
            const Icon = item.icon;
            const selected = edition === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`edition-card edition-card-${item.id} reveal ${selected ? "selected" : ""}`}
                aria-pressed={selected}
                onClick={() => setEdition(item.id)}>
                <span className="edition-card-top">
                  <span className="edition-icon">
                    <Icon size={22} strokeWidth={1.8} />
                  </span>

                  <span className="edition-state">
                    {selected ? (
                      <>
                        <Check size={13} strokeWidth={2.6} /> Viewing
                      </>
                    ) : (
                      "Switch"
                    )}
                  </span>
                </span>

                <span className="edition-audience">{item.audience}</span>
                <strong className="edition-name">{item.label}</strong>
                <span className="edition-pitch">{item.pitch}</span>

                <span className="edition-specs">
                  {item.specs.map((spec) => (
                    <span key={spec}>{spec}</span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default EditionSwitcher;
