import "../index.css";

function Hero({ edition }) {
  const isDev = edition.id === "dev";

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-content">
          <p className="eyebrow">{edition.eyebrow}</p>

          <h1>{edition.title}</h1>

          <p className="hero-description">{edition.description}</p>

          <a href="#waitlist" className="primary-button">
            {edition.cta}
            <span>→</span>
          </a>

          {isDev ? (
            <div className="terminal-status">
              <span className="status-dot" />
              {edition.status}
            </div>
          ) : (
            <div className="pet-status">🐾 {edition.status}</div>
          )}
        </div>

        <div className="hero-device">
          <div className="device">
            <div className="device-screen">
              {isDev ? (
                <div className="dev-screen">
                  <small>FUCHEY // DEV</small>

                  <strong>TX DETECTED</strong>

                  <span>0x8f2...91ac</span>

                  <span>PROGRAM INTERACTION</span>

                  <span>STATUS: CONFIRMED</span>
                </div>
              ) : (
                <div className="companion-screen">
                  <div className="pet-face">◡̈</div>

                  <strong>HI HUMAN!</strong>

                  <small>You received something ✨</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
