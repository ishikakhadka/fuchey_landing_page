import { packBackdrop } from "../data/packs";
// Where a drop is in its window, and the countdown text the site shows.
// Dates only drive display; sales open from the on-chain listing.

export const DROP_PHASE = {
  SOON: "soon", // live switch on, no dates yet
  UPCOMING: "upcoming", // starts in the future
  OPEN: "open", // started (or no start) and not ended
  ENDED: "ended",
};

export function dropPhase(drop, now = Date.now()) {
  const start = drop.startsAt ? Date.parse(drop.startsAt) : null;
  const end = drop.endsAt ? Date.parse(drop.endsAt) : null;
  if (end != null && now >= end) return DROP_PHASE.ENDED;
  if (start != null && now < start) return DROP_PHASE.UPCOMING;
  if (start == null && end == null) return DROP_PHASE.SOON;
  return DROP_PHASE.OPEN;
}

// The moment the countdown runs to, or null.
export function dropTarget(drop, now = Date.now()) {
  const phase = dropPhase(drop, now);
  if (phase === DROP_PHASE.UPCOMING) return Date.parse(drop.startsAt);
  if (phase === DROP_PHASE.OPEN && drop.endsAt) return Date.parse(drop.endsAt);
  return null;
}

export function splitDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

// "2d 14h", "3h 05m", "4m 09s"
export function shortCountdown(ms) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const pad = (n) => String(n).padStart(2, "0");
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${pad(minutes)}m`;
  return `${minutes}m ${pad(seconds)}s`;
}

// What a banner says about timing.
export function dropTiming(drop, now = Date.now()) {
  const phase = dropPhase(drop, now);
  const target = dropTarget(drop, now);
  if (phase === DROP_PHASE.UPCOMING) return { phase, text: `Drops in ${shortCountdown(target - now)}`, target };
  if (phase === DROP_PHASE.OPEN && target) return { phase, text: `Ends in ${shortCountdown(target - now)}`, target };
  if (phase === DROP_PHASE.OPEN) return { phase, text: "On now", target: null };
  if (phase === DROP_PHASE.ENDED) return { phase, text: "Ended", target: null };
  return { phase, text: "Coming soon", target: null };
}

// Live drops the site should show (ended ones drop off by themselves).
export const visibleDrops = (drops, now = Date.now()) => drops.filter((d) => d.live && dropPhase(d, now) !== DROP_PHASE.ENDED);

// Built-in scene for each pack (public/backdrops/<pack>.svg).
export const backdropFor = (drop) => drop.backdropUrl || packBackdrop(drop.pack);
