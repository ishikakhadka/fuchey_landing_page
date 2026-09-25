import "../index.css";
function Features({ edition }) {
  return (
    <section id="features" className="features-section">
      <div className="container">
        <div className="section-heading">
          <p className="eyebrow">
            {edition.id === "dev" ? "DEVELOPER TOOLKIT" : "FUCHEY LIFE"}
          </p>

          <h2>
            {edition.id === "dev"
              ? "Closer to the chain."
              : "A wallet with a little personality."}
          </h2>
        </div>

        <div className="feature-grid">
          {edition.features.map((feature, index) => (
            <div className="feature-card" key={feature}>
              <span>0{index + 1}</span>

              <h3>{feature}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
