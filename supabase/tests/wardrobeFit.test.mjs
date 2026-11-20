// Animator → website wardrobe placement (supabase/functions/_shared/wardrobeFit.js).
// No backend needed:  node --test supabase/tests/wardrobeFit.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { buildVisual, checkFit, SITE_SLOT, siteFit } from "../functions/_shared/wardrobeFit.js";

const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

// Where a canvas pixel lands on the website when the base still is drawn as
// <image width=96 height=96> with xMidYMid meet (the browser's own rule).
function meet(W, H, px, py) {
  const k = Math.min(96 / W, 96 / H);
  return [(96 - W * k) / 2 + px * k, (96 - H * k) / 2 + py * k];
}

test("pixel pack canvas 224×232: the crop's corners land where the base's pixels do", () => {
  const box = { x: 70, y: 8, w: 84, h: 40 };
  const s = siteFit({ canvas: [224, 232], offset: [0, 0], box }, 2);
  const [x0, y0] = meet(224, 232, box.x, box.y);
  close(s.x, x0);
  close(s.y, y0);
  assert.equal(s.width, 168);
  assert.equal(s.height, 80);
  // the far corner: x + width·scale
  const [x1, y1] = meet(224, 232, box.x + box.w, box.y + box.h);
  close(s.x + s.width * s.scale, x1);
  close(s.y + s.height * s.scale, y1);
  close(s.scale, 96 / 232 / 2, 1e-6);
});

test("vector pack canvas 448×512 at 1 output px per canvas px", () => {
  const s = siteFit({ canvas: [448, 512], offset: [0, 0], box: { x: 0, y: 0, w: 448, h: 512 } }, 1);
  close(s.x, 6);
  close(s.y, 0);
  close(s.width * s.scale, 84);
  close(s.height * s.scale, 96);
});

test("a character offset moves the item by the same canvas pixels", () => {
  const box = { x: 70, y: 30, w: 84, h: 40 };
  const a = siteFit({ canvas: [224, 232], offset: [0, 0], box }, 2);
  const b = siteFit({ canvas: [224, 232], offset: [0, -16], box }, 2);
  close(a.y - b.y, 16 * (96 / 232));
  close(a.x, b.x);
});

test("checkFit refuses what the website can't draw and records the head group", () => {
  const ok = checkFit({ character: "new_pirate", canvas: [224, 232], box: { x: 1, y: 2, w: 3, h: 4 } }, 0, "hat");
  assert.equal(ok.fit.placement.group, "head");
  assert.equal(ok.fit.placement.layer.siteLayer, "hat");
  assert.ok(checkFit({ character: "x", canvas: [224, 232], box: { x: 1, y: 2, w: 3, h: 4 }, rotation: 15 }, 0, "hat").problems);
  assert.ok(checkFit({ character: "x", canvas: [224, 232], box: { x: 1, y: 2, w: 3, h: 4 }, scaleX: 2 }, 0, "hat").problems);
  assert.ok(checkFit({ character: "x", canvas: [224, 232], box: { x: 220, y: 2, w: 10, h: 4 } }, 0, "hat").problems);
  assert.ok(checkFit({ character: "x", canvas: [224, 232], box: { x: 1, y: 2, w: 3, h: 4 }, anchor: [0.5, 0.5] }, 0, "hat").problems);
});

test("buildVisual: first site character is the base, the rest are overrides, unlinked ones are reported", () => {
  const fit = (character_id, y, front, back) => ({
    character_id,
    site: { x: 10, y, width: 20, height: 10, scale: 0.2 },
    files: { front, back },
  });
  const ids = { new_pirate: "new-pirate", new_squidman: "new-squidman" };
  const { visual, compatibleCharacters, unmatched } = buildVisual(
    "back",
    [fit("new_pirate", 5, null, "https://x/a.png"), fit("new_squidman", 7, "https://x/f.png", null), fit("new_zombie_pirate", 5, null, "https://x/b.png")],
    (c) => ids[c] ?? null,
  );
  assert.equal(visual.kind, "image");
  assert.equal(visual.layer, SITE_SLOT.back);
  assert.equal(visual.image, null);
  assert.equal(visual.backImage, "https://x/a.png");
  assert.deepEqual(visual.perCharacter["new-squidman"], { image: "https://x/f.png", y: 7, backImage: null });
  assert.deepEqual(compatibleCharacters, ["new-pirate", "new-squidman"]);
  assert.deepEqual(unmatched, ["new_zombie_pirate"]);
});

test("neck and face share the website accessory layer, face above neck", () => {
  const f = { character_id: "a", site: { x: 0, y: 0, width: 1, height: 1, scale: 1 }, files: { front: "https://x/1.png" } };
  const neck = buildVisual("neck", [f], () => "a").visual;
  const face = buildVisual("face", [f], () => "a").visual;
  assert.equal(neck.layer, "accessory");
  assert.equal(face.layer, "accessory");
  assert.ok(face.z > neck.z);
});
