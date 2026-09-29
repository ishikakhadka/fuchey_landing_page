import { useEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { CHAPTERS, createFucheyScene } from "../three/fucheyScene.js";

function Fuchey3D({ edition }) {
  const wrapRef = useRef(null);
  const overlayRef = useRef(null);
  const sceneRef = useRef(null);
  const initialEdition = useRef(edition);
  const [status, setStatus] = useState("loading");
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // A fresh canvas per mount: StrictMode mounts twice in dev, and a canvas
    // whose WebGL context was disposed can't be reused by a new renderer.
    const canvas = document.createElement("canvas");
    canvas.setAttribute(
      "aria-label",
      "Interactive 3D model of the Fuchey device. Drag to turn it, tap to make it hop.",
    );
    wrap.prepend(canvas);

    const ctrl = createFucheyScene({
      canvas,
      container: wrap,
      overlay: overlayRef.current,
      edition: initialEdition.current,
      reduced,
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

  return (
    <>
      <div ref={wrapRef} className={`fuchey-3d is-${status}`}>
        <div ref={overlayRef} className="fuchey-overlay" />
        {status === "loading" && <span className="fuchey-3d-loader" aria-hidden="true" />}
      </div>

      <div className="stage-bar">
        {status === "ready" && (
          <div className="stage-chapters" role="group" aria-label="Features" key={edition}>
            {CHAPTERS[edition].list.map(([, label], i) => (
              <button
                type="button"
                key={label}
                aria-current={i === chapter}
                onClick={() => sceneRef.current?.seek(i)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="stage-hint">
        <MousePointer2 size={13} strokeWidth={2} />
        Drag to turn · tap to hop
      </p>
    </>
  );
}

export default Fuchey3D;
