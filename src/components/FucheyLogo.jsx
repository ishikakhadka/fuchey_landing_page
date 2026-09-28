// Fuchey wordmark: a pixel paw on a rounded brand tile, then a clean 5×7 pixel
// "FUCHEY". Colours come from the theme tokens, so it follows each edition.

const PAW = [
  "...........",
  "...##.##...",
  "...##.##...",
  ".##.....##.",
  ".##.....##.",
  "....###....",
  "...#####...",
  "..#######..",
  "..#######..",
  "...##.##...",
  "...........",
];

const LETTERS = {
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
};

const TILE = 11;
const GAP = 1.5;

// Merge each row's filled units into runs → one compact path.
function toPath(rows, ox = 0, oy = 0) {
  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      let w = 1;
      while (row[x + w] === "#") w++;
      d += `M${ox + x} ${oy + y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  });
  return d;
}

const PAW_PATH = toPath(PAW);
let cursor = TILE + 4;
let WORD_PATH = "";
for (const ch of "FUCHEY") {
  WORD_PATH += toPath(LETTERS[ch], cursor, 2);
  cursor += 5 + GAP;
}
const WIDTH = cursor - GAP;

function FucheyLogo({ className = "" }) {
  return (
    <svg
      className={`fuchey-logo ${className}`}
      viewBox={`0 0 ${WIDTH} ${TILE}`}
      aria-hidden="true"
      focusable="false">
      <g className="fuchey-logo-mark">
        <rect width={TILE} height={TILE} rx="2.6" />
        <path d={PAW_PATH} shapeRendering="crispEdges" />
      </g>
      <path className="fuchey-logo-word" d={WORD_PATH} shapeRendering="crispEdges" />
    </svg>
  );
}

export default FucheyLogo;
