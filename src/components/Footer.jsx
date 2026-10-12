import { Link } from "react-router";

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Fuchey home">
              <img src="/fuchey_logo.png" alt="Fuchey" />
            </Link>

            <p>Interactive on-chain collectibles, with a companion that brings them off the screen.</p>
          </div>

          <div className="footer-links">
            <div>
              <p className="footer-heading">EXPLORE</p>
              <Link to="/#discover">Reveal a character</Link>
              <Link to="/#companion">The companion</Link>
              <Link to="/#waitlist">Waitlist</Link>
            </div>

            <div>
              <p className="footer-heading">MARKETPLACE</p>
              <Link to="/marketplace">Browse all</Link>
              <Link to="/characters">Character packs</Link>
              <Link to="/wardrobe">Wardrobe</Link>
              <Link to="/collection">My Collection</Link>
            </div>

            <div>
              <p className="footer-heading">COMMUNITY</p>

              <a
                href="https://github.com/belly1v123/Fuchey"
                target="_blank"
                rel="noreferrer">
                GitHub
              </a>

              <a href="#" target="_blank" rel="noreferrer">
                X / Twitter
              </a>

              <a href="#">Discord</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Fuchey</span>
          <span>Built for Solana.</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
