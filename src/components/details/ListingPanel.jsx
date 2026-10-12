import { Link } from "react-router";
import { BadgeCheck, CalendarClock, CircleSlash, Loader2, PackageOpen, ShieldCheck } from "lucide-react";

import PriceTag from "../marketplace/PriceTag";
import PurchaseButton from "../marketplace/PurchaseButton";
import { useListing } from "../../hooks/useListing";
import { useCollection } from "../../hooks/useCollection";
import { getAvailability } from "../../utils/listing";
import { NETWORK } from "../../config/network";
import { formatCount } from "../../utils/format";

// What a visitor can do with this item right now, spelled out per state:
// a new mint, coming soon, not on sale on this network, or sold out — plus
// whether the connected wallet already owns one. All sales on Fuchey today
// are new mints from the item's collection; there's no resale market yet.
function ListingPanel({ item }) {
  const live = useListing(item);
  const { connected, countOwned, loading: ownedLoading } = useCollection();
  const availability = getAvailability(item, live);
  const owned = connected ? countOwned(item.id) : 0;
  const { listing, sale } = item;

  const STATES = {
    "on-sale": {
      icon: PackageOpen,
      title: listing.price === 0 ? "New mint · free to claim" : "New mint",
      text: `Minted new from the ${item.name} collection, straight to your wallet. Not a resale.`,
    },
    "coming-soon": {
      icon: CalendarClock,
      title: availability.label,
      text: sale
        ? `Deployed on ${NETWORK.label}. The sale hasn’t opened yet.`
        : "Announced, not minted yet. Price and supply arrive with the drop.",
    },
    "not-listed": {
      icon: CircleSlash,
      title: `Not on sale on ${NETWORK.label}`,
      text: "It’s in the catalogue, but there’s no open sale for it on this network right now.",
    },
    "sold-out": {
      icon: CircleSlash,
      title: availability.label,
      text: "No new mints are left. Resale isn’t available on Fuchey yet.",
    },
  };
  const state = STATES[availability.id];
  const Icon = state.icon;

  const remaining =
    live.remaining != null ? formatCount(live.remaining) : live.deployed ? "Checking…" : "—";

  return (
    <div className={`listing-panel is-${availability.id}`}>
      {owned > 0 && (
        <div className="listing-owned">
          <BadgeCheck size={18} strokeWidth={2} />
          <div>
            <strong>You own {owned === 1 ? "one" : formatCount(owned)}</strong>
            <span>Verified from {NETWORK.label} for your connected wallet.</span>
          </div>
          <Link to="/collection" className="text-link">
            View →
          </Link>
        </div>
      )}

      <div className="listing-state">
        <Icon size={18} strokeWidth={2} />
        <div>
          <strong>{state.title}</strong>
          <span>{state.text}</span>
        </div>
      </div>

      <dl className="listing-figures">
        <div>
          <dt>Price</dt>
          <dd>
            <PriceTag listing={listing} size="lg" />
          </dd>
        </div>
        <div>
          <dt>Supply</dt>
          <dd>{formatCount(live.supply)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{remaining}</dd>
        </div>
        <div>
          <dt>Per wallet</dt>
          <dd>{listing.limitPerWallet ? `${listing.limitPerWallet} max` : "No limit"}</dd>
        </div>
      </dl>

      <PurchaseButton item={item} size="lg" />

      {connected && ownedLoading && (
        <p className="listing-note">
          <Loader2 size={14} className="spin" /> Checking what your wallet holds…
        </p>
      )}

      {availability.id === "on-sale" && (
        <p className="listing-note">
          <ShieldCheck size={15} strokeWidth={2} />
          You approve the transaction in your own wallet, and it only counts once {NETWORK.label}{" "}
          confirms it. Fuchey never sees your keys.
        </p>
      )}
    </div>
  );
}

export default ListingPanel;
