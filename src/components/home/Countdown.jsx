import { splitDuration } from "../../utils/drops";

// Days / hours / minutes / seconds blocks counting down to `target` (ms).
function Countdown({ target, now, compact = false }) {
  const { days, hours, minutes, seconds } = splitDuration(target - now);
  const pad = (n) => String(n).padStart(2, "0");
  const parts = [
    [pad(days), compact ? "Days" : "Days"],
    [pad(hours), compact ? "Hrs" : "Hours"],
    [pad(minutes), compact ? "Min" : "Mins"],
    [pad(seconds), compact ? "Sec" : "Secs"],
  ];
  return (
    <div className="hm-countdown" role="timer" aria-label={`${days} days, ${hours} hours, ${minutes} minutes left`}>
      {parts.map(([value, label]) => (
        <span key={label} className="hm-tick">
          <b>{value}</b>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}

export default Countdown;
