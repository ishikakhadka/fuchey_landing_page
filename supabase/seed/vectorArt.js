// Vector art for every vector pack — SEED DATA ONLY (see build-seed.mjs).
// The art itself lives with its pack; vectorKit.js has the shared drawing
// toolkit and body frame.

import { animeCharacters, animeWearables } from "./animeArt.js";
import { brainrotCharacters, brainrotWearables } from "./brainrotArt.js";
import { cartoonCharacters, cartoonWearables } from "./cartoonArt.js";
import { heroesCharacters, heroesWearables } from "./heroesArt.js";
import { legendsCharacters, legendsWearables } from "./legendsArt.js";
import { mythsCharacters, mythsWearables } from "./mythsArt.js";
import { wildCharacters } from "./wildArt.js";

export const vectorCharacters = {
  ...wildCharacters,
  ...cartoonCharacters,
  ...animeCharacters,
  ...mythsCharacters,
  ...legendsCharacters,
  ...heroesCharacters,
  ...brainrotCharacters,
};
export const vectorWearables = {
  ...cartoonWearables,
  ...animeWearables,
  ...mythsWearables,
  ...legendsWearables,
  ...heroesWearables,
  ...brainrotWearables,
};
