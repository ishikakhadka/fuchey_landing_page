// 16×16 pixel art for the pack characters, plus placeholders for unreleased
// ones (the Rhino), drawn to match the Yeti's pixel style. Each sprite is a
// 16×16 grid: one string per row, one character per pixel, "." for
// transparent.
//
// An unlocked sprite is a full character: the renderer scales it ×6 onto the
// same 96×96 grid as the Yeti, and its pack's wearables are drawn to fit it
// (see the pack gear and its per-character anchors in wearableArt.js — move
// a head or a hand here and update its anchor there). So characters are drawn
// bare: hats, masks and weapons belong in the wardrobe.
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
  // Pirate Pack
  captain: {
    palette: { o: "#1b2430", n: "#c8443c", s: "#f1c27d", e: "#1b2430", b: "#6b3e26", r: "#b8323a", y: "#f2c14e", d: "#3b2a20" },
    rows: [
      "................",
      "................",
      "....oooooooo....",
      "...onnnnnnnno...",
      "...onnnnnnnnoon.",
      "...osssssssso.n.",
      "...osesssseso...",
      "...osssssssso...",
      "...obbbbbbbbo...",
      "..orrbbbbbbrro..",
      ".orrrybbbbyrrro.",
      ".orrrrbbbbrrrro.",
      ".osrryyyyyyrrso.",
      "..orrrrrrrrrro..",
      "...oddo..oddo...",
      "...ooo....ooo...",
    ],
  },
  squidman: {
    palette: { o: "#1b2430", p: "#8e5cc2", l: "#c49be8", e: "#fff3a0", k: "#1b2430", r: "#2e4a7d", y: "#f2c14e", d: "#3b2a20" },
    rows: [
      ".....oooooo.....",
      "....opplpppo....",
      "...opplppppo....",
      "..oppppppppppo..",
      "..opkeppppekpo..",
      "..oppppppppppo..",
      "..oplpplpplppo..",
      "..opopoppopopo..",
      "..orprrrrrrpro..",
      ".orrrpryyrprrro.",
      ".orrrrryyrrrrro.",
      ".oprrrryyrrrrpo.",
      "..orrrrrrrrrro..",
      "..orrrroorrrro..",
      "...oddo..oddo...",
      "...ooo....ooo...",
    ],
  },
  "zombie-pirate": {
    palette: { o: "#1b2430", g: "#8fbf6a", G: "#5f8f45", n: "#c8443c", e: "#f7f2a0", k: "#1b2430", w: "#e9e4d4", s: "#3a5a8c", t: "#4a3b2e", d: "#3b2a20" },
    rows: [
      "....oooooooo....",
      "...onnnnnnnno...",
      "..onnnnnnnnnnoo.",
      "..oggggggggggonn",
      "..ogekggggekggo.",
      "..ogggggGgggggo.",
      "..oggwkwkwkgggo.",
      "...ogggggggggo..",
      "...owswswswswo..",
      "..ogwswswswswgo.",
      "..ogswswswswsgo.",
      "..oowswswswswoo.",
      "...ottttttttto..",
      "...otto.ottto...",
      "...ogGo..oddo...",
      "...ooo....ooo...",
    ],
  },

  // Tribal Pack
  warrior: {
    palette: { o: "#1b2430", h: "#2b1a12", s: "#a0623c", k: "#1b2430", r: "#c0392b", y: "#e0a43a", l: "#6b8f3a" },
    rows: [
      "................",
      "................",
      "....oooooooo....",
      "...ohhhhhhhho...",
      "...ohssssssho...",
      "...osksssskso...",
      "...orssssssro...",
      "...osskkkksso...",
      "...osssssssso...",
      "..ossrssssrsso..",
      "..osoyyyyyyoso..",
      "...ollllllllo...",
      "...osllllllso...",
      "....oso..oso....",
      "...osso..osso...",
      "...ooo....ooo...",
    ],
  },
  shaman: {
    palette: { o: "#1b2430", c: "#38d6ee", h: "#7a5230", y: "#f2c14e", s: "#8a5a3c", k: "#1b2430", r: "#e9e4d4", w: "#e9e4d4", l: "#c47a2b" },
    rows: [
      ".oco............",
      ".oco............",
      "..h.oooooooooo..",
      "..h.oyyyyyyyyo..",
      "..h.osssssssso..",
      "..h.osksssskso..",
      "..h.osssrrssso..",
      "..h..osssssso...",
      "..h.ollwwwwllo..",
      "..hoslllwlllllo.",
      "..hosllllllllso.",
      "..h.ollllllllo..",
      "..h.ollllllllo..",
      "..h.olllllllllo.",
      "..h..oso..oso...",
      "..h..ooo..ooo...",
    ],
  },

  // Rogues Pack
  goblin: {
    palette: { o: "#1b2430", g: "#6fae4a", e: "#f2d14e", k: "#1b2430", w: "#f2efe6", t: "#7a5a3a", y: "#c9a24a", i: "#c9d3dc", h: "#3b2a20" },
    rows: [
      "................",
      "....oooooooo....",
      "o..oggggggggo..o",
      "ogooggggggggoogo",
      ".oggekggggekggo.",
      "..ooggggggggoo..",
      "...ogwgggwggo...",
      "....oggggggo....",
      "...otttttttto...",
      "..ogttttttttgoi.",
      "..ogtyttttttgoi.",
      "...otttttttto.h.",
      "...otttttttto...",
      "....ogo..ogo....",
      "...oggo..oggo...",
      "...ooo....ooo...",
    ],
  },
  bandit: {
    palette: { o: "#1b2430", h: "#4a3426", s: "#e0ac7e", k: "#1b2430", r: "#8a2f2f", c: "#566173", b: "#6b4a2e", y: "#c9a24a", d: "#2b2b38" },
    rows: [
      "................",
      "................",
      "....oooooooo....",
      "...ohhhhhhhho...",
      "...ohssssssho...",
      "...osksssskso...",
      "...orrrrrrrro...",
      "...orrrrrrrro...",
      "..occrrrrrrcco..",
      ".occccbbbbcccco.",
      ".osccccyyccccso.",
      ".occcccccccccco.",
      "..occcccccccco..",
      "...occo..occo...",
      "...oddo..oddo...",
      "...ooo....ooo...",
    ],
  },
};
