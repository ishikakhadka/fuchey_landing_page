import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import DropSlide from "./DropSlide";
import ScratchSlide from "./ScratchSlide";
import CustomSlide from "./CustomSlide";
import { useContent } from "../../context/ContentContext";
import { useReducedMotion } from "../../hooks/useMotion";
import { useNow } from "../../hooks/useNow";
import { visibleDrops } from "../../utils/drops";
import { getPack } from "../../data/packs";

const PAUSE_AFTER_INTERACTION = 12; // seconds

// The home hero: the slides set up in the admin (Home tab), in order. A drop
// slide only shows while its drop is live and not over; the carousel moves on
// by itself every `autoplaySeconds` (0 = never), pauses for a while when the
// visitor interacts, on hover / keyboard focus, and for reduced motion.
function HeroCarousel({ revealedIds, onCardReveal }) {
  const { slides, drops, settings, loading } = useContent();
  const reduced = useReducedMotion();
  const now = useNow();

  const live = visibleDrops(drops, now);
  const list = slides
    .filter((s) => s.enabled !== false)
    .map((s) => (s.kind === "drop" ? { ...s, drop: live.find((d) => d.id === s.dropId && d.showInHero) } : s))
    .filter((s) => s.kind !== "drop" || s.drop);

  const [{ index, elapsed }, setPos] = useState({ index: 0, elapsed: 0 });
  const pauseLeft = useRef(0);
  const hovering = useRef(false);

  const count = list.length;
  const current = count ? index % count : 0;
  const seconds = settings.autoplaySeconds;

  const interact = () => {
    pauseLeft.current = PAUSE_AFTER_INTERACTION;
  };
  const go = (i) => {
    interact();
    setPos({ index: ((i % count) + count) % count, elapsed: 0 });
  };

  // One tick a second drives the progress bar and the switch.
  useEffect(() => {
    if (reduced || count < 2 || !seconds) return;
    const id = setInterval(() => {
      if (pauseLeft.current > 0) {
        pauseLeft.current -= 1;
        return;
      }
      if (hovering.current) return;
      setPos((p) => (p.elapsed + 1 < seconds ? { ...p, elapsed: p.elapsed + 1 } : { index: (p.index + 1) % count, elapsed: 0 }));
    }, 1000);
    return () => clearInterval(id);
  }, [reduced, count, seconds]);

  if (loading) return <section className="hm-hero is-loading" aria-busy="true" />;
  if (!count) return null;

  const slide = list[current];
  const label = (s) =>
    s.kind === "drop" ? `${s.drop.label || "Next drop"} · ${getPack(s.drop.pack).name}` : s.kind === "scratch" ? "Scratch to reveal" : s.title;

  return (
    <section
      className="hm-hero"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocus={() => (hovering.current = true)}
      onBlur={() => (hovering.current = false)}>
      <div className="hm-hero-slide" key={slide.id} aria-roledescription="slide" aria-label={`${current + 1} of ${count}`}>
        {slide.kind === "drop" ? (
          <DropSlide drop={slide.drop} now={now} />
        ) : slide.kind === "scratch" ? (
          <ScratchSlide slide={slide} revealedIds={revealedIds} onCardReveal={onCardReveal} onInteract={interact} />
        ) : (
          <CustomSlide slide={slide} />
        )}
      </div>

      {count > 1 && (
        <div className="hm-controls">
          <div className="hm-tabs">
            {list.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={i === current ? "is-on" : ""}
                aria-current={i === current}
                aria-label={`Show slide ${i + 1}: ${label(s)}`}
                onClick={() => go(i)}>
                <span className="hm-tab-label">
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  {label(s)}
                </span>
                <span className="hm-tab-bar">
                  <span
                    style={{
                      width: i === current ? `${reduced || !seconds ? 100 : Math.round(((elapsed + 1) / seconds) * 100)}%` : "0%",
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="hm-arrows">
            <button type="button" aria-label="Previous slide" onClick={() => go(current - 1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Next slide" onClick={() => go(current + 1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default HeroCarousel;
