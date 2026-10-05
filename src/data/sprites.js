// Placeholder pixel art for unreleased characters, drawn to match the
// Yeti's pixel style. Each sprite is a 16×16 grid: one string per
// row, one character per pixel, "." for transparent.
//
// Locked characters render as a silhouette of every non-"." pixel, so leg
// gaps and the horn are kept clear of outline to stay readable that way.
//
// Wearables have their own art in wearableArt.js.

export const sprites = {
  rhino: {
    palette: { o: "#1b2430", g: "#8f9aa6", l: "#b9c3cc", d: "#5d6877", h: "#e8dcc4", c: "#38d6ee" },
    rows: [
      "..o.............",
      ".oho............",
      ".ohho...o.......",
      "..ohho.ogo......",
      "..ohhooggooooo..",
      "..ohhhggggggggo.",
      "..olhggggggggggo",
      ".ollggggggggggdo",
      ".ollcgggggggggdo",
      ".ollggggggggggdo",
      "..olgggggggggddo",
      "...oggdggdggdggo",
      "...ogd.gd.gd.gdo",
      "...ogd.gd.gd.gdo",
      "....oo.oo.oo.oo.",
      "................",
    ],
  },
};
