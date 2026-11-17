// Helpers shared by the Animator tab (StudioAdmin) and the Character
// editor's "Import from animator" (StudioImport).

export const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Every GIF of a version, grouped by animation: { idle: { 1: render, 2: render }, … }
export function gifsByAnimation(version) {
  const out = {};
  for (const r of version?.renders ?? []) if (r.kind === "gif") (out[r.animation] ||= {})[r.scale] = r;
  return out;
}

// The still preview at `scale`, or the largest there is.
export const previewOf = (version, scale = 2) => {
  const p = (version?.renders ?? []).filter((r) => r.kind === "preview").sort((a, b) => a.scale - b.scale);
  return p.find((r) => r.scale === scale) ?? p.at(-1) ?? null;
};

// Animator ids use underscores (new_bandit); marketplace ids use dashes.
export const siteId = (id) => id.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
