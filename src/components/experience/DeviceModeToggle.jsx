import { editions } from "../../data/editions";

const ITEMS = Object.values(editions);

// Dev / Companion switch for the device showcase. It only changes which
// experience the device shows; the rest of the site keeps one layout.
function DeviceModeToggle({ value, onChange, className = "" }) {
  const activeIndex = ITEMS.findIndex((item) => item.id === value);

  return (
    <div
      className={`edition-toggle device-mode-toggle ${className}`}
      role="group"
      aria-label="Device experience"
      style={{ "--active": activeIndex }}>
      <span className="edition-toggle-thumb" aria-hidden="true" />

      {ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            className={value === item.id ? "active" : ""}
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}>
            <Icon size={15} strokeWidth={2} />
            <span>{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DeviceModeToggle;
