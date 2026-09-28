import { editions } from "../data/editions";

function Navbar({ edition, setEdition }) {
  const items = Object.values(editions);
  const activeIndex = items.findIndex((item) => item.id === edition);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a href="#top" className="logo" aria-label="Fuchey home">
          <img src="/fuchey_logo.png" alt="Fuchey" />
        </a>

        <nav aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#editions">Editions</a>
          <a href="#features">Features</a>
          <a href="#waitlist">Waitlist</a>
        </nav>

        <div
          className="edition-toggle"
          role="group"
          aria-label="Edition"
          style={{ "--active": activeIndex }}>
          <span className="edition-toggle-thumb" aria-hidden="true" />

          {items.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={edition === item.id ? "active" : ""}
                aria-pressed={edition === item.id}
                onClick={() => setEdition(item.id)}>
                <Icon size={15} strokeWidth={2} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
