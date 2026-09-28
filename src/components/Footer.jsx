import "../index.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#" className="footer-logo">
              <img src="/fuchey_logo.png" alt="Fuchey Logo" />
            </a>

            <p>Your Solana wallet, with a little personality.</p>
          </div>

          <div className="footer-links">
            <div>
              <p className="footer-heading">EXPLORE</p>
              <a href="#editions">Editions</a>
              <a href="#features">Features</a>
              <a href="#waitlist">Waitlist</a>
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
