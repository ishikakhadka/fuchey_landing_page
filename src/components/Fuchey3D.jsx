import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { CHAPTERS, createFucheyScene } from "../three/fucheyScene.js";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Fuchey3D({ edition }) {
  // three.js owns everything inside this layer (canvas, callouts), React the rest.
  const layerRef = useRef(null);
  const sceneRef = useRef(null);
  const initialEdition = useRef(edition);
  const [status, setStatus] = useState("loading");
  // The tour waits for a press when the visitor prefers reduced motion.
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [chapter, setChapter] = useState(0);
  const initialPlaying = useRef(playing);

  useEffect(() => {
    const layer = layerRef.current;

    // A fresh canvas per mount: StrictMode mounts twice in dev, and a canvas
    // whose WebGL context was disposed can't be reused by a new renderer.
    const canvas = document.createElement("canvas");
    canvas.setAttribute(
      "aria-label",
      "Interactive 3D model of the Fuchey device. Drag to turn it.",
    );
    layer.appendChild(canvas);

    const ctrl = createFucheyScene({
      canvas,
      container: layer,
      edition: initialEdition.current,
      reduced: prefersReducedMotion(),
      playing: initialPlaying.current,
      onReady: () => setStatus("ready"),
      onError: () => setStatus("failed"),
      onChapter: setChapter,
    });

    if (!ctrl) {
      canvas.remove();
      queueMicrotask(() => setStatus("failed"));
      return;
    }

    sceneRef.current = ctrl;

    return () => {
      ctrl.dispose();
      canvas.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setEdition(edition);
  }, [edition]);

  useEffect(() => {
    sceneRef.current?.setPlaying(playing);
  }, [playing]);

  const chapters = CHAPTERS[edition] ?? CHAPTERS.companion;

  return (
    <div className={`fuchey-3d is-${status}`}>
      <div ref={layerRef} className="fuchey-3d-layer" />
      {status === "loading" && <span className="fuchey-3d-loader" aria-hidden="true" />}

      {status === "ready" && (
        <div className="tour-bar">
          <button
            type="button"
            className="tour-play"
            aria-label={playing ? "Pause tour" : "Play tour"}
            onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={14} strokeWidth={2.4} /> : <Play size={14} strokeWidth={2.4} />}
          </button>

          <div className="tour-chapters" role="group" aria-label="Tour chapters">
            {chapters.map(([t, label], i) => (
              <button
                key={label}
                type="button"
                aria-current={i === chapter}
                onClick={() => sceneRef.current?.seek(t)}>
                {label}
              </button>
            ))}
          </div>

          <span className="tour-hint">Drag to turn</span>
        </div>
      )}
    </div>
  );
}

export default Fuchey3D;
