import { useListing } from "../../hooks/useListing";
import { formatCount } from "../../utils/format";

// Supply for an item. Remaining is read live from its candy machine; until
// an item is deployed on this network only the planned supply is shown.
function SupplyMeter({ item }) {
  const live = useListing(item);

  if (live.supply == null) {
    return <span className="supply-meter is-unknown">Supply TBA</span>;
  }

  const known = live.remaining != null;

  return (
    <div className="supply-meter">
      <div className="supply-meter-row">
        <span>
          {known
            ? `${formatCount(live.remaining)} left`
            : live.deployed
              ? "Checking supply…"
              : "Not on sale yet"}
        </span>
        <span>{formatCount(live.supply)} supply</span>
      </div>

      {known && (
        <div className="supply-meter-track" aria-hidden="true">
          <span style={{ width: `${(live.redeemed / live.supply) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default SupplyMeter;
