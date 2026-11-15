import { useEffect, useState } from "react";

import ItemArt from "../marketplace/ItemArt";
import RarityBadge from "../marketplace/RarityBadge";

const STEP_MS = 3200;

// A drop's characters standing together; every few seconds the next one
// steps into the middle, larger, while the rest move round to the sides.
// It starts with the drop's middle pick (the admin puts the star there).
function CrewLineup({ characters, paused = false }) {
  const n = characters.length;
  const start = Math.floor((n - 1) / 2);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(id);
  }, [n, paused]);

  const active = (((start + step) % n) + n) % n;
  const lead = characters[active];

  return (
    <div className={`hm-lineup count-${Math.min(n, 5)}`}>
      <span className="hm-plat-glow" aria-hidden="true" />
      <span className="hm-plat" aria-hidden="true" />

      {characters.map((c, i) => (
        <figure key={c.id} className={`hm-mate ${slotOf(i, active, n)}`} aria-hidden={i !== active}>
          <ItemArt art={c.art} alt={i === active ? c.title ?? c.name : ""} itemId={c.id} size="lg" />
        </figure>
      ))}

      {lead && (
        <p className="hm-mate-name" key={lead.id} aria-live="polite">
          {lead.name} <RarityBadge rarity={lead.rarity} />
        </p>
      )}
    </div>
  );
}

// Position relative to the one in the middle: 0 → centre, +1 → right,
// −1 → left, ±2 → further out, the rest wait out of sight behind.
function slotOf(i, active, n) {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  if (d === 0) return "is-center";
  if (Math.abs(d) > 2) return "is-hidden";
  return `is-${d < 0 ? "left" : "right"}-${Math.abs(d)}`;
}

export default CrewLineup;
