import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import ItemArt from "../marketplace/ItemArt";
import { getPack } from "../../data/packs";

const Fuchey3D = lazy(() => import("../Fuchey3D.jsx"));

const BRUSH = 22; // scratch radius, CSS px
const CLEAR_AT = 0.45; // share scratched off before the rest falls away

// The frost coating: a brushed ice-blue foil with a little sparkle and a
// prompt, drawn to fit the canvas.
function paintCoat(canvas, sub) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width: w, height: h } = canvas;
  const dpr = w / canvas.clientWidth || 1;

  ctx.globalCompositeOperation = "source-over";
  const foil = ctx.createLinearGradient(0, 0, w, h);
  foil.addColorStop(0, "#bad0dd");
  foil.addColorStop(0.45, "#89adbb");
  foil.addColorStop(0.7, "#5c86a2");
  foil.addColorStop(1, "#9fbfcc");
  ctx.fillStyle = foil;
  ctx.fillRect(0, 0, w, h);

  // brushed lines
  ctx.strokeStyle = "rgba(246, 248, 248, 0.08)";
  ctx.lineWidth = dpr;
  for (let x = -h; x < w; x += 6 * dpr) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }

  // a few fixed glints (deterministic, so redraws look the same)
  ctx.fillStyle = "rgba(246, 248, 248, 0.55)";
  for (let i = 0; i < 26; i++) {
    const x = ((i * 97) % 100) / 100;
    const y = ((i * 61 + 13) % 100) / 100;
    ctx.fillRect(x * w, y * h, 2 * dpr, 2 * dpr);
  }

  ctx.fillStyle = "#162e3e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Shrinks on narrow cards so the prompt never touches the edges.
  const size = Math.min(13, canvas.clientWidth / 19);
  ctx.font = `700 ${size * 1.35 * dpr}px "Bricolage Grotesque", "DM Sans", sans-serif`;
  ctx.fillText("Scratch to reveal", w / 2, h / 2);
  ctx.font = `500 ${12 * dpr}px "DM Sans", sans-serif`;
  ctx.fillStyle = "rgba(22, 46, 62, 0.7)";
  ctx.fillText(sub, w / 2, h / 2 + 24 * dpr);
}

// Share of the coating already scratched away (sampled, not every pixel).
function clearedShare(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 4 * 24) {
    total++;
    if (data[i] === 0) clear++;
  }
  return total ? clear / total : 0;
}

// What's under the frost, per kind of card.
const KINDS = {
  character: {
    sub: "who’s under the frost?",
    hint: "A character from the collection is under the frost.",
  },
  device: {
    sub: "what’s under the frost?",
    hint: "The little device your characters will live on is under the frost.",
  },
};

// A collectible scratch card for the hero: a character (or the Fuchey device)
// under a frost coating that the visitor scratches off with the pointer, or
// reveals with a button. Nothing is won: it's a look at the collection.
function ScratchCard({ kind = "character", character, edition = "companion", revealed, onReveal, onDeal }) {
  const canvasRef = useRef(null);
  const [scratching, setScratching] = useState(false);
  const device = kind === "device";
  const copy = KINDS[kind];
  const ready = device || Boolean(character);

  // Latest callback without re-running the canvas effect (which repaints).
  const revealRef = useRef(onReveal);
  useEffect(() => {
    revealRef.current = onReveal;
  });

  // Paint the coating at the canvas's size; repaint on resize until the
  // visitor starts scratching (a repaint would undo their progress).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    if (!ready) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      paintCoat(canvas, copy.sub);
      return;
    }
    let touched = false;
    let moves = 0;
    let down = false;
    let last = null;

    const fit = () => {
      if (touched) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      paintCoat(canvas, copy.sub);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    // Fonts may arrive after the first paint.
    document.fonts?.ready.then(fit);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const point = (e) => {
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width;
      return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k, r: BRUSH * k };
    };
    const scratch = (p) => {
      // destination-out erases by the stroke's alpha, so it must be opaque.
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      ctx.lineCap = "round";
      ctx.lineWidth = p.r * 2;
      ctx.beginPath();
      ctx.moveTo((last ?? p).x, (last ?? p).y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };
    const check = () => {
      if (clearedShare(canvas) >= CLEAR_AT) revealRef.current();
    };

    const onDown = (e) => {
      down = true;
      touched = true;
      last = null;
      canvas.setPointerCapture?.(e.pointerId);
      setScratching(true);
      scratch(point(e));
    };
    const onMove = (e) => {
      if (!down) return;
      scratch(point(e));
      if (++moves % 10 === 0) check();
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      last = null;
      setScratching(false);
      check();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [revealed, ready, copy.sub]);

  return (
    <div className={`scratch ${revealed ? "is-revealed" : ""} ${scratching ? "is-scratching" : ""}`}>
      <div className="scratch-card">
        <div className="scratch-card-head">
          <span>Fuchey</span>
          <span>{revealed ? "Revealed" : "Scratch card"}</span>
        </div>

        <div
          className={`scratch-window character-stage stage-${device ? edition : (character?.edition ?? "companion")} ${device ? "is-device" : ""}`}>
          {device && (
            <Suspense fallback={<div className="fuchey-3d is-loading" />}>
              <Fuchey3D compact edition={edition} />
            </Suspense>
          )}
          {!device && ready && (
            <div className="xp-idle">
              <ItemArt
                art={character.art}
                alt={revealed ? character.title : ""}
                itemId={character.id}
                size="lg"
              />
            </div>
          )}
          <span className="stage-floor" aria-hidden="true" />
          {!revealed && (
            <canvas
              ref={canvasRef}
              className={`scratch-coat ${ready ? "" : "is-waiting"}`}
              aria-label={`Scratch card coating. Drag across it to reveal ${device ? "the device" : "a character"}, or use the reveal button below.`}
              role="img"
            />
          )}
        </div>

        <div className="scratch-card-foot" aria-live="polite">
          {revealed && device ? (
            <a href="#waitlist" className="scratch-result">
              <span>
                <strong>Fuchey device</strong>
                <small>In development</small>
              </span>
              <span className="scratch-inspect">Join the waitlist</span>
            </a>
          ) : revealed && character ? (
            <Link to={`/characters/${character.id}`} className="scratch-result" viewTransition>
              <span>
                <strong>{character.name}</strong>
                <small>{getPack(character.pack).name}</small>
              </span>
              <span className="scratch-inspect">Inspect</span>
            </Link>
          ) : (
            <span className="scratch-hint">{copy.hint}</span>
          )}
        </div>
      </div>

      <div className="scratch-actions">
        {revealed ? (
          device ? (
            <span className="scratch-tip">Drag to turn it · tap to make it hop</span>
          ) : (
            <button type="button" className="look-action" onClick={onDeal}>
              Deal another card
            </button>
          )
        ) : (
          <button type="button" className="look-action" onClick={onReveal} disabled={!ready}>
            Reveal without scratching
          </button>
        )}
      </div>
    </div>
  );
}

export default ScratchCard;
