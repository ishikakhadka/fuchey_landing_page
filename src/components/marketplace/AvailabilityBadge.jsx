import { useListing } from "../../hooks/useListing";
import { getAvailability } from "../../utils/listing";

// Where an item stands on this network (on sale / coming soon / sold out /
// not on sale here). Read from the verified sale and live supply only.
function AvailabilityBadge({ item, className = "" }) {
  const live = useListing(item);
  const { id, label } = getAvailability(item, live);

  return (
    <span className={`availability availability-${id} ${className}`}>
      <span className="availability-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export default AvailabilityBadge;
