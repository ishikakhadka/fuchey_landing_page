import { lazy, Suspense } from "react";
import { ArrowRight, MousePointer2 } from "lucide-react";

// three.js is heavy — load it in its own chunk so the copy paints first.
const Fuchey3D = lazy(() => import("./Fuchey3D.jsx"));

function Hero({ edition }) {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-content" key={edition.id}>
          <p className="pill">
            <span className="pulse" aria-hidden="true" />
            {edition.eyebrow}
          </p>

          <h1>
            {edition.title} <span className="accent">{edition.accent}</span>
          </h1>

          <p className="hero-description">{edition.description}</p>

          <div className="hero-actions">
            <a href="#waitlist" className="primary-button">
              {edition.cta}
              <ArrowRight size={18} strokeWidth={2.2} />
            </a>

            <a href="#how" className="ghost-button">
              How it works
            </a>
          </div>

          <ul className="hero-highlights">
            {edition.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="hero-stage">
          <div className="stage-orb" aria-hidden="true" />
          <div className="stage-ring" aria-hidden="true" />

          <Suspense fallback={<div className="fuchey-3d is-loading" />}>
            <Fuchey3D edition={edition.id} />
          </Suspense>

          <div className="stage-chips" key={edition.id} aria-hidden="true">
            {edition.chips.map((chip, index) => (
              <div className={`stage-chip chip-${index + 1}`} key={chip.label}>
                <small>{chip.label}</small>
                <strong>{chip.value}</strong>
              </div>
            ))}
          </div>

          <p className="stage-hint">
            <MousePointer2 size={13} strokeWidth={2} />
            Drag to rotate · tap to hop
          </p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
