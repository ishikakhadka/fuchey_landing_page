import { editions } from "../data/editions";

import { Bot, Smile } from "lucide-react";

const editionIcons = {
  dev: Bot,
  companion: Smile,
};

function EditionSwitcher({ edition, setEdition }) {
  return (
    <section className="edition-switcher">
      <div className="container">
        <p className="section-label">
          ONE FUCHEY. TWO WAYS TO EXPERIENCE SOLANA.
        </p>

        <div className="edition-buttons">
          {Object.values(editions).map((item) => {
            const Icon = editionIcons[item.id];

            return (
              <button
                key={item.id}
                className={edition === item.id ? "selected" : ""}
                onClick={() => setEdition(item.id)}>
                <span className="edition-icon">
                  <Icon size={18} strokeWidth={1.8} />
                </span>

                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default EditionSwitcher;
