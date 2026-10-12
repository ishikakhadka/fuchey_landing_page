import { Component, lazy, Suspense, useRef } from "react";

import yetiUrl from "../../assets/yeti.png";
import { useInView } from "../../hooks/useMotion";

// three.js is heavy: its own chunk, fetched only when this section nears the
// viewport. The scene pauses itself off-screen and disposes on unmount.
const Fuchey3D = lazy(() => import("../Fuchey3D.jsx"));

// Static stand-in when WebGL or the 3D chunk isn't available.
function DeviceFallback() {
  return (
    <div className="xp-device-fallback">
      <img src={yetiUrl} alt="" width="192" height="192" />
      <span>The interactive 3D preview couldn’t load on this device.</span>
    </div>
  );
}

class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <DeviceFallback /> : this.props.children;
  }
}

// Section E: the physical companion, as the thing that takes your collectibles
// off the screen, introduced after the collectibles themselves.
function CompanionSection({ edition }) {
  const stageRef = useRef(null);
  const near = useInView(stageRef, { rootMargin: "300px" });

  return (
    <section className="xp-section xp-companion" id="companion" aria-labelledby="xp-companion-title">
      <div className="container xp-companion-grid">
        <div className="hero-stage xp-companion-stage" ref={stageRef}>
          <div className="stage-backdrop" aria-hidden="true" />
          <div className="stage-ring" aria-hidden="true" />
          {near ? (
            <SceneBoundary>
              <Suspense fallback={<div className="fuchey-3d is-loading" />}>
                <Fuchey3D edition={edition} />
              </Suspense>
            </SceneBoundary>
          ) : (
            <div className="fuchey-3d is-loading" />
          )}
          <span className="xp-stage-tag">Device prototype · in development</span>
        </div>

        <div className="xp-companion-copy">
          <p className="eyebrow">THE PHYSICAL COMPANION</p>
          <h2 id="xp-companion-title">Your collectibles don’t have to stay on a screen.</h2>
          <p className="xp-companion-lede">
            Fuchey explores a more interactive form of digital ownership, connecting supported
            on-chain collectibles with a physical companion and integrated self-custodial wallet
            functionality.
          </p>

          <p className="xp-fineprint">
            The device is designed for supported Fuchey collectibles. Other NFTs won’t work with it
            automatically.
          </p>

          <a href="#waitlist" className="ghost-button">
            Join the device waitlist
          </a>
        </div>
      </div>
    </section>
  );
}

export default CompanionSection;
