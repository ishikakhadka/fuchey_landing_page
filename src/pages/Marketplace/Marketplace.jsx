import { RefreshCw } from "lucide-react";

import NetworkBadge from "../../components/wallet/NetworkBadge";
import DropBanner from "../../components/drops/DropBanner";
import PackCarousel from "../../components/marketplace/PackCarousel";
import { useCatalog } from "../../context/CatalogContext";
import { NETWORK } from "../../config/network";

// /marketplace — the current drop and every character pack in a carousel
// that moves on its own. Each pack opens its own page with its characters.
function Marketplace() {
  const { error, reload } = useCatalog();

  return (
    <div className="container market-page rd-page mk-page">
      <section className="mk-intro">
        <header className="mk-head">
          <h1 className="rd-title">
            Discover <span className="accent">Collectibles</span>
          </h1>
          <div className="browse-network">
            <NetworkBadge />
            {!NETWORK.isMainnet && <span>Test network: prices are in {NETWORK.label} SOL.</span>}
          </div>
        </header>
        {error && (
          <div className="market-error" role="alert">
            Couldn’t load the collection.{" "}
            <button type="button" className="text-link" onClick={reload}>
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        )}
        <DropBanner />
        <PackCarousel autoplay />
      </section>
    </div>
  );
}

export default Marketplace;
