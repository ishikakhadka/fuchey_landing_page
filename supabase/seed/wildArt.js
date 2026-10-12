// Wild pack vector art — SEED DATA ONLY (see build-seed.mjs and vectorKit.js).
//
// The Rhino is a chibi: a big round head on a short, chubby body, drawn
// smooth like the vector packs and centred on the Yeti's x = 44.5. Its hands
// sit where the Yeti's do, so held items fit as drawn; everything worn on
// the head, face or shoulders is moved onto it by `rhinoFit` below. The Wild
// outfits are fitted to the Yeti's tall body, so the Rhino doesn't wear them.

import { INK, box, ell, flat, pts, solid, stroke } from "./vectorKit.js";

const CX = 44.5;
const mirrorX = (list) => list.map(([x, y]) => [2 * CX - x, y]).reverse();

// Rhino: a round blue-grey rhino with little pink-lined leaf ears, big shiny eyes, a
// chunky curved ivory horn on a pale muzzle, a round belly, stubby arms and
// feet with ivory toenails, and a little curly tail.
function rhino() {
  const skin = { b: "#a9b8cc", l: "#d4deeb", d: "#8494ab" };
  const pale = { b: "#dfe6f0", l: "#f6f8fc", d: "#bccad9" };
  const horn = { b: "#f5ebd3", l: "#fffbf2", d: "#d5c39d" };
  const pink = "#f4a7b5";

  const earL = [[27.5, 14], [21.5, 9], [19.8, 4], [23.5, 3.2], [28.5, 6.5], [31.5, 10]];
  const innerL = [[26.8, 11.8], [22.6, 8.2], [21.6, 5.2], [24, 4.8], [27.8, 7.4], [29.6, 10]];
  const armL = [[31, 51], [24, 54.5], [17.5, 61], [18, 68.5], [24.5, 67], [30, 62.5], [32.5, 58]];
  const nails = (x) => [x - 3.8, x, x + 3.8].flatMap((nx) => flat(ell(nx, 92.3, 1.4, 1), horn.b, { line: true }));

  return [
    // Curly tail and ears, behind everything
    ...stroke("M60 76C67 77 70 72 67.5 69.5C66 68 64 69.5 65.5 71", { color: INK, sw: 3.4 }),
    ...stroke("M60 76C67 77 70 72 67.5 69.5C66 68 64 69.5 65.5 71", { color: skin.b, sw: 1.8 }),
    ...solid(pts(earL), skin, { shine: false }),
    ...flat(pts(innerL), pink),
    ...solid(pts(mirrorX(earL)), skin, { shine: false }),
    ...flat(pts(mirrorX(innerL)), pink),

    // Stubby legs and feet
    ...solid(box(30, 78, 41, 89, 3.5), skin, { shine: false }),
    ...solid(box(48, 78, 59, 89, 3.5), skin, { shine: false }),
    ...solid(ell(35.5, 89.5, 8, 4.4), skin, { shine: false }),
    ...solid(ell(53.5, 89.5, 8, 4.4), skin, { shine: false }),
    ...nails(35.5),
    ...nails(53.5),

    // Round body and belly
    ...solid(pts([[33, 47], [56, 47], [63.5, 56], [66, 68], [62, 80], [44.5, 84], [27, 80], [23, 68], [25.5, 56]]), skin),
    ...solid(ell(CX, 68, 12, 11.5), pale, { shine: false }),

    // Stubby arms, hands where the Yeti's are
    ...solid(pts(armL), skin, { shine: false }),
    ...solid(pts(mirrorX(armL)), skin, { shine: false }),
    ...solid(ell(20.5, 68, 5, 4.6), skin, { shine: false }),
    ...solid(ell(68.5, 68, 5, 4.6), skin, { shine: false }),

    // Big round head and broad muzzle
    ...solid(ell(CX, 27, 24, 20.5), skin),
    ...solid(ell(CX, 38.5, 15.5, 8.6), pale, { shine: false }),
    ...flat(ell(38.6, 39.6, 1.6, 1.15), skin.d),
    ...flat(ell(50.4, 39.6, 1.6, 1.15), skin.d),
    ...stroke("M40 43Q44.5 46.6 49 43", { sw: 1.3 }),

    // Big shiny eyes, brows and pink cheeks
    ...[[35, 0.7], [54, -0.7]].flatMap(([x, look]) => [
      ...flat(ell(x, 25, 4.8, 5.6), "#ffffff", { line: true }),
      ...flat(ell(x + look, 25.9, 3, 3.6), INK),
      ...flat(ell(x + look + 1.1, 24.2, 1.2, 1.35), "#ffffff"),
      ...flat(ell(x + look - 1, 27.8, 0.55), "#ffffff", { op: 0.85 }),
    ]),
    ...stroke("M30 17.8Q34.5 16.2 38.6 17.6M50.4 17.6Q54.5 16.2 59 17.8", { color: skin.d, sw: 1.2 }),
    ...flat(ell(27.5, 33.5, 3.4, 1.9), pink, { op: 0.7 }),
    ...flat(ell(61.5, 33.5, 3.4, 1.9), pink, { op: 0.7 }),

    // The chunky curved horn rising off the muzzle
    ...solid(pts([[40.4, 34.5], [41, 29], [42.6, 23.6], [45, 19.4], [47.4, 17.4], [47.8, 21.4], [48.4, 27.5], [48.8, 34.5]]), horn),
    ...stroke("M41.5 29.6Q44.7 28.6 48.2 29.6M42.6 25Q45 24.2 47.9 25", { color: horn.d, sw: 0.9 }),
  ];
}

export const wildCharacters = {
  rhino: { shapes: rhino() },
};

// Where each Wild wearable (pixel art drawn for the Yeti) sits on the
// Rhino: a shift in grid units, stored as the wearable's per-character
// placement. Held items need none: the Rhino's hands are where the Yeti's are.
export const rhinoFit = {
  "blue-beanie": { y: 7 },
  "glacier-crown": { y: 7 },
  "dhaka-topi": { y: 7 },
  "genesis-halo": { y: 7 },
  "signal-headphones": { y: 10 },
  "dev-visor": { y: 12 },
  "pixel-glasses": { y: 12 },
  "frost-scarf": { y: 20 },
  "solana-backpack": { y: 20 },
};
