import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { editions } from "../data/editions";
import WalletButton from "./wallet/WalletButton";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/characters", label: "Characters" },
  { to: "/wardrobe", label: "Wardrobe" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/collection", label: "My Collection" },
];

function Navbar({ edition, setEdition }) {
  const items = Object.values(editions);
  const activeIndex = items.findIndex((item) => item.id === edition);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className={`navbar ${menuOpen ? "menu-open" : ""}`}>
      <div className="container navbar-inner">
        <Link to="/" className="logo" aria-label="Fuchey home">
          <img src="/fuchey_logo.png" alt="Fuchey" />
        </Link>

        <nav aria-label="Primary" id="primary-nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
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

          <WalletButton />

          <button
            type="button"
            className="menu-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
