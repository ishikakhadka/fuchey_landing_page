import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import cyberUrl from "../../assets/cyber-yeti.png";
import yetiUrl from "../../assets/yeti.png";

// Section F: the closing invitation into the marketplace.
function FindYourFuchey() {
  return (
    <section className="xp-section xp-final" aria-labelledby="xp-final-title">
      <div className="container">
        <div className="xp-final-card reveal">
          <div className="xp-final-art" aria-hidden="true">
            <img src={cyberUrl} alt="" width="192" height="192" className="is-back" />
            <img src={yetiUrl} alt="" width="192" height="192" className="is-front" />
          </div>
          <div className="xp-final-copy">
            <p className="eyebrow">THE MARKETPLACE</p>
            <h2 id="xp-final-title">Find your Fuchey.</h2>
            <p>Browse every character and wearable, see what’s on sale, and collect the ones that feel like you.</p>
            <Link to="/marketplace" className="primary-button" viewTransition>
              Explore the Marketplace
              <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FindYourFuchey;
