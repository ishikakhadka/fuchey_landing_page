import { useEffect, useRef, useState } from "react";
import { createFucheyScene } from "../three/fucheyScene.js";

function Fuchey3D({ edition }) {
  const wrapRef = useRef(null);
  const sceneRef = useRef(null);
  const initialEdition = useRef(edition);
  const [status, setStatus] = useState("loading");

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
      "Interactive 3D model of the Fuchey device. Drag or use the arrow keys to turn it, tap to make it hop.",
    );
    canvas.tabIndex = 0;
    wrap.appendChild(canvas);

    const ctrl = createFucheyScene({
      canvas,
      container: wrap,
      edition: initialEdition.current,
      reduced,
      onReady: () => setStatus("ready"),
      onError: () => setStatus("failed"),
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
    <div ref={wrapRef} className={`fuchey-3d is-${status}`}>
      {status === "loading" && <span className="fuchey-3d-loader" aria-hidden="true" />}
    </div>
  );
}

export default Fuchey3D;
