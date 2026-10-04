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

            <p>Your Solana wallet, with a little personality.</p>
          </div>

          <div className="footer-links">
            <div>
              <p className="footer-heading">EXPLORE</p>
              <Link to="/#how">How it works</Link>
              <Link to="/#editions">Editions</Link>
              <Link to="/#features">Features</Link>
              <Link to="/#waitlist">Waitlist</Link>
            </div>

            <div>
              <p className="footer-heading">MARKETPLACE</p>
              <Link to="/characters">Characters</Link>
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
