// Placeholder pixel art for unreleased characters, drawn to match the
// Yeti's pixel style. Each sprite is a 16×16 grid: one string per
// row, one character per pixel, "." for transparent. `m()` mirrors an 8-pixel
// half-row so symmetric shapes only need their left side drawn.
//
// Wearables have their own art in wearableArt.js.

const m = (half) => half + [...half].reverse().join("");
const empty = "................";

export const sprites = {
  robot: {
    palette: { o: "#1b2430", g: "#8a9aab", c: "#38d6ee", m: "#4b5a6a" },
    rows: [
      empty,
      m(".......o"),
      m("......oo"),
      m("...ooooo"),
      m("..oggggg"),
      m("..ogcogg"),
      m("..oggggg"),
      m("..oggmmm"),
      m("...ooooo"),
      m(".ooggggg"),
      m("oggggggg"),
      m("ogoggggg"),
      m("ogoggggg"),
      m("...ggogg"),
      m("...oo..o"),
      m("..ooo..o"),
    ],
  },
};
