import { Link } from "react-router";

// A hero slide written in the admin: eyebrow, two-line headline, copy, an
// optional image and a button.
function CustomSlide({ slide }) {
  const href = slide.ctaHref;
  return (
    <div className="hm-slide hm-slide-custom">
      <div className="hm-slide-bg" aria-hidden="true">
        <span className="hm-frost-glow" />
        <span className="tx-dots fade-soft" style={{ left: "-6%", top: "15%", width: "55%", height: "90%" }} />
        <span className="sh-arc" style={{ left: "40%", top: "20%", width: 240, height: 240 }} />
      </div>
      <div className="hm-slide-copy">
        {slide.eyebrow && (
          <span className="hm-kicker">
            <span aria-hidden="true" />
            {slide.eyebrow}
          </span>
        )}
        <h2 className="hm-title">
          <span>{slide.title}</span>
          {slide.titleAccent && <span className="accent">{slide.titleAccent}</span>}
        </h2>
        {slide.body && <p className="hm-lede">{slide.body}</p>}
        {slide.ctaLabel && href && (
          <div className="hm-actions">
            {href.startsWith("/") ? (
              <Link to={href} className="hm-btn is-primary">{slide.ctaLabel}</Link>
            ) : (
              <a href={href} className="hm-btn is-primary">{slide.ctaLabel}</a>
            )}
          </div>
        )}
      </div>
      {slide.imageUrl && (
        <div className="hm-slide-stage">
          <img src={slide.imageUrl} alt="" className="hm-custom-art" />
        </div>
      )}
    </div>
  );
}

export default CustomSlide;
