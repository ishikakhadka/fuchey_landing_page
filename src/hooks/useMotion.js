import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Whether the visitor asked for less motion (live: follows the OS setting).
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

// True once `ref`'s element has come near the viewport, and stays true. Used
// to defer heavy work (the 3D scene) until a section is about to be seen.
export function useInView(ref, { rootMargin = "200px" } = {}) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) {
      queueMicrotask(() => setSeen(true));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}

// Pointer + scroll parallax for a section, written as CSS custom properties
// on the element (--mx / --my in -1…1, --scroll in 0…1 across its height) so
// styles do the moving. One rAF per frame at most; nothing runs with reduced
// motion or on touch-only devices, and listeners go away on unmount.
export function useParallax(ref, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let raf = 0;
    let mx = 0;
    let my = 0;

    const write = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
      el.style.setProperty("--scroll", scroll.toFixed(3));
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(write);
    };
    const onPointer = (e) => {
      const rect = el.getBoundingClientRect();
      mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      my = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      request();
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
      request();
    };

    if (finePointer) {
      el.addEventListener("pointermove", onPointer);
      el.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("scroll", request, { passive: true });
    request();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", request);
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
      el.style.removeProperty("--scroll");
    };
  }, [ref, enabled]);
}
