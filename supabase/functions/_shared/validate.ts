// Validation for admin writes. Everything the public site renders comes
// through here, so the rules mirror what src/render/visual.js and the
// marketplace components expect. Returns a clean row (unknown keys dropped)
// or throws a 400 listing every problem.

import { HttpError } from "./http.ts";

export const SLOTS = ["hat", "headwear", "outfit", "accessory", "backpack", "held", "special"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const STATUSES = ["available", "coming-soon", "sold-out"];
const EDITIONS = ["companion", "dev"];
// Mirrors src/data/packs.js.
const PACKS = ["wild", "pirates", "tribal", "rogues", "cartoon", "anime", "myths", "legends", "heroes", "brainrot"];
const BUILT_IN_IMAGES = ["yeti"];

type Obj = Record<string, unknown>;

class Checker {
  errors: string[] = [];
  fail(path: string, msg: string) {
    this.errors.push(`${path}: ${msg}`);
  }
  done() {
    if (this.errors.length) throw new HttpError(400, "Please fix the highlighted fields.", this.errors);
  }

  str(o: Obj, key: string, { max = 2000, min = 0, required = false } = {}) {
    const v = o[key];
    if (v == null || v === "") {
      if (required || min > 0) this.fail(key, "required");
      return "";
    }
    if (typeof v !== "string") return this.fail(key, "must be text"), "";
    if (v.length < min || v.length > max) this.fail(key, `must be ${min}–${max} characters`);
    return v.trim();
  }
  oneOf(o: Obj, key: string, options: string[], fallback?: string) {
    const v = o[key] ?? fallback;
    if (typeof v !== "string" || !options.includes(v)) this.fail(key, `must be one of ${options.join(", ")}`);
    return v as string;
  }
  num(o: Obj, key: string, { min = -Infinity, max = Infinity, int = false, nullable = true, path = key } = {}) {
    const v = o[key];
    if (v == null || v === "") {
      if (!nullable) this.fail(path, "required");
      return null;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || (int && !Number.isInteger(n)) || n < min || n > max) {
      this.fail(path, `must be ${int ? "a whole number" : "a number"} between ${min} and ${max}`);
      return null;
    }
    return n;
  }
  url(v: unknown, path: string, nullable = true) {
    if (v == null || v === "") {
      if (!nullable) this.fail(path, "required");
      return null;
    }
    try {
      const u = new URL(String(v));
      if (!["https:", "http:"].includes(u.protocol)) throw new Error();
      return u.toString();
    } catch {
      this.fail(path, "must be an http(s) URL");
      return null;
    }
  }
}

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function listing(c: Checker, o: Obj) {
  const status = c.oneOf(o, "status", STATUSES, "coming-soon");
  const price = c.num(o, "price", { min: 0, max: 1_000_000 });
  const supply = c.num(o, "supply", { min: 1, max: 100_000_000, int: true });
  const limit_per_wallet = c.num(o, "limit_per_wallet", { min: 1, max: 1_000_000, int: true });
  if (status === "available") {
    if (price == null) c.fail("price", "required for items on sale (0 = free claim)");
    if (supply == null) c.fail("supply", "required for items on sale");
  }
  return { status, price, supply, limit_per_wallet };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_RUNS = 20000;

function runs(c: Checker, v: unknown, path: string, nullable = true) {
  if (v == null) {
    if (!nullable) c.fail(path, "required");
    return null;
  }
  if (!Array.isArray(v) || v.length > MAX_RUNS) return c.fail(path, `must be a list of ≤ ${MAX_RUNS} pixel runs`), null;
  const out = [];
  for (const r of v) {
    if (
      !isObj(r) ||
      ![r.x, r.y, r.w].every((n) => Number.isInteger(n) && Math.abs(n as number) <= 512) ||
      (r.w as number) < 1 ||
      typeof r.c !== "string" ||
      !HEX.test(r.c)
    ) {
      c.fail(path, "contains an invalid run (needs integer x, y, w ≥ 1 and #rrggbb colour)");
      return null;
    }
    out.push({ x: r.x as number, y: r.y as number, w: r.w as number, c: r.c });
  }
  return out;
}

// Vector shapes: SVG path data with a fill and/or stroke. Only path data and
// colours are kept, never markup, so nothing here can inject SVG or HTML.
const MAX_SHAPES = 600;
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]{1,20000}$/;

function shapes(c: Checker, v: unknown, path: string, nullable = true) {
  if (v == null) {
    if (!nullable) c.fail(path, "required");
    return null;
  }
  if (!Array.isArray(v) || !v.length || v.length > MAX_SHAPES) return c.fail(path, `must be a list of 1–${MAX_SHAPES} shapes`), null;
  const out = [];
  for (const s of v) {
    const colour = (x: unknown, none: boolean) => x == null || (typeof x === "string" && (HEX.test(x) || (none && x === "none")));
    const n = (x: unknown, max: number) => x == null || (typeof x === "number" && x >= 0 && x <= max);
    if (!isObj(s) || typeof s.d !== "string" || !PATH_D.test(s.d) || !colour(s.fill, true) || !colour(s.stroke, false) || !n(s.sw, 12) || !n(s.op, 1)) {
      c.fail(path, "contains an invalid shape (needs path data d, #rrggbb fill / stroke, sw 0–12, op 0–1)");
      return null;
    }
    const shape: Obj = { d: s.d };
    for (const k of ["fill", "stroke", "sw", "op"]) if (s[k] != null) shape[k] = s[k];
    out.push(shape);
  }
  return out;
}

function box(c: Checker, v: unknown, path: string) {
  const ok = isObj(v) && [v.x, v.y, v.w, v.h].every((n) => typeof n === "number" && Math.abs(n) <= 512) && (v.w as number) > 0 && (v.h as number) > 0;
  if (!ok) return c.fail(path, "must be { x, y, w, h } with w, h > 0"), null;
  return { x: v.x, y: v.y, w: v.w, h: v.h };
}

function boundsOf(list: { x: number; y: number; w: number }[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of list) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w - 1);
    y1 = Math.max(y1, r.y);
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : { x: 0, y: 0, w: 1, h: 1 };
}

// Placement / image fields shared by the base visual and per-character overrides.
function placement(c: Checker, o: Obj, path: string, partial: boolean) {
  const out: Obj = {};
  const has = (k: string) => o[k] != null && o[k] !== "";
  const num = (k: string, opts: { min: number; max: number; int?: boolean }) => {
    if (!partial || has(k)) out[k] = c.num(o, k, { ...opts, nullable: false, path: `${path}.${k}` });
  };
  num("x", { min: -96, max: 192 });
  num("y", { min: -96, max: 192 });
  num("scale", { min: 0.01, max: 16 });
  num("width", { min: 1, max: 2048, int: true });
  num("height", { min: 1, max: 2048, int: true });
  if (!partial || has("image")) out.image = c.url(o.image, `${path}.image`, false);
  if (has("backImage")) out.backImage = c.url(o.backImage, `${path}.backImage`);
  return out;
}

export function visual(c: Checker, v: unknown, type: string, compatible: string[]) {
  if (!isObj(v)) return c.fail("visual", "required"), null;
  const kind = v.kind;
  const layer = v.layer == null ? type : c.oneOf(v, "layer", SLOTS);
  const z = c.num(v, "z", { min: -50, max: 50, int: true, path: "visual.z" }) ?? 0;
  let out: Obj;

  if (kind === "runs") {
    const front = runs(c, v.front, "visual.front", false) ?? [];
    const back = runs(c, v.back, "visual.back");
    const icon = runs(c, v.icon, "visual.icon");
    out = { kind, layer, z, front, back, icon, bounds: boundsOf(icon ?? [...(back ?? []), ...front]) };
    // Optional shift of the whole layer
    const x = c.num(v, "x", { min: -96, max: 96, int: true, path: "visual.x" });
    const y = c.num(v, "y", { min: -96, max: 96, int: true, path: "visual.y" });
    if (x) out.x = x;
    if (y) out.y = y;
    // Runs drawn finer than the grid: `res` pixels per grid unit
    const res = c.num(v, "res", { min: 1, max: 4, int: true, path: "visual.res" });
    if (res && res !== 1) out.res = res;
  } else if (kind === "vector") {
    out = {
      kind,
      layer,
      z,
      front: shapes(c, v.front, "visual.front", false),
      back: shapes(c, v.back, "visual.back"),
      icon: shapes(c, v.icon, "visual.icon"),
      bounds: box(c, v.bounds, "visual.bounds"),
    };
    const x = c.num(v, "x", { min: -96, max: 96, path: "visual.x" });
    const y = c.num(v, "y", { min: -96, max: 96, path: "visual.y" });
    if (x) out.x = x;
    if (y) out.y = y;
  } else if (kind === "image") {
    out = { kind, layer, z, ...placement(c, v, "visual", false) };
  } else {
    c.fail("visual.kind", 'must be "runs", "vector" or "image"');
    return null;
  }

  if (v.perCharacter != null) {
    if (!isObj(v.perCharacter)) c.fail("visual.perCharacter", "must be an object");
    else {
      const per: Obj = {};
      for (const [id, o] of Object.entries(v.perCharacter)) {
        const p = `visual.perCharacter.${id}`;
        if (!compatible.includes(id)) c.fail(p, "character isn't in the compatible list");
        else if (!isObj(o)) c.fail(p, "must be an object");
        else {
          const entry: Obj = placement(c, o, p, true);
          // Pixel-run wearables can be redrawn per character (pack gear is
          // drawn to fit each pack character's own shape).
          if (kind === "runs") {
            for (const side of ["front", "back", "icon"]) {
              if (o[side] == null) continue;
              const list = runs(c, o[side], `${p}.${side}`);
              if (list) entry[side] = list;
            }
            type Runs = { x: number; y: number; w: number }[];
            if (entry.front || entry.back) entry.bounds = boundsOf([...((entry.back ?? []) as Runs), ...((entry.front ?? []) as Runs)]);
          } else if (kind === "vector") {
            for (const side of ["front", "back", "icon"]) {
              if (o[side] == null) continue;
              const list = shapes(c, o[side], `${p}.${side}`);
              if (list) entry[side] = list;
            }
            if (o.bounds != null) entry.bounds = box(c, o.bounds, `${p}.bounds`);
          }
          if (o.layer != null) entry.layer = c.oneOf(o, "layer", SLOTS);
          if (o.z != null) entry.z = c.num(o, "z", { min: -50, max: 50, int: true, path: `${p}.z` });
          if (Object.keys(entry).length) per[id] = entry;
        }
      }
      if (Object.keys(per).length) out.perCharacter = per;
    }
  }
  return out;
}

const common = (c: Checker, o: Obj) => ({
  id: (() => {
    const id = c.str(o, "id", { required: true, max: 48 });
    if (id && !/^[a-z0-9][a-z0-9-]{1,47}$/.test(id)) c.fail("id", "lowercase letters, numbers and dashes only");
    return id;
  })(),
  name: c.str(o, "name", { min: 1, max: 60 }),
  description: c.str(o, "description", { max: 1000 }),
  rarity: c.oneOf(o, "rarity", RARITIES, "common"),
  published: o.published === true,
  sort_order: c.num(o, "sort_order", { min: -10000, max: 10000, int: true }) ?? 0,
});

export function validateWearable(input: unknown, characterIds: string[]) {
  const c = new Checker();
  if (!isObj(input)) throw new HttpError(400, "Missing wearable.");
  const base = common(c, input);
  const type = c.oneOf(input, "type", SLOTS);

  const compatible = Array.isArray(input.compatible_characters)
    ? [...new Set(input.compatible_characters.map(String))]
    : [];
  compatible.forEach((id) => characterIds.includes(id) || c.fail("compatible_characters", `unknown character “${id}”`));
  if (!compatible.length) c.fail("compatible_characters", "pick at least one character");

  const row = {
    ...base,
    type,
    pack: c.oneOf(input, "pack", PACKS, "wild"),
    compatible_characters: compatible,
    ...listing(c, input),
    image_url: c.url(input.image_url, "image_url"),
    visual: visual(c, input.visual, type, compatible),
  };
  c.done();
  return row;
}

export function validateCharacter(input: unknown) {
  const c = new Checker();
  if (!isObj(input)) throw new HttpError(400, "Missing character.");
  const base = common(c, input);

  let art: Obj | null = null;
  const a = input.art;
  if (!isObj(a)) c.fail("art", "required");
  else if (a.kind === "character") {
    const image = typeof a.image === "string" && BUILT_IN_IMAGES.includes(a.image) ? a.image : c.url(a.image, "art.image", false);
    art = { kind: "character", image };
  } else if (a.kind === "sprite") {
    const s = a.sprite;
    const rows = isObj(s) && Array.isArray(s.rows) ? s.rows : null;
    const palette = isObj(s) && isObj(s.palette) ? s.palette : null;
    const width = rows?.[0]?.length;
    if (
      !rows || !palette || !width || rows.length > 256 || width > 256 ||
      !rows.every((r) => typeof r === "string" && r.length === width && [...r].every((ch) => ch === "." || ch in palette)) ||
      !Object.values(palette).every((v) => typeof v === "string" && HEX.test(v))
    ) c.fail("art.sprite", "rows must be equal-length strings using only palette keys or “.”");
    else art = { kind: "sprite", sprite: { palette, rows }, locked: a.locked === true };
  } else if (a.kind === "vector") {
    const list = shapes(c, a.shapes, "art.shapes", false);
    if (list) art = { kind: "vector", shapes: list, locked: a.locked === true };
  } else c.fail("art.kind", 'must be "character", "sprite" or "vector"');

  const attributes = Array.isArray(input.attributes)
    ? input.attributes
        .filter((x) => isObj(x) && x.trait_type && x.value != null)
        .map((x) => ({ trait_type: String((x as Obj).trait_type).slice(0, 40), value: String((x as Obj).value).slice(0, 80) }))
    : [];
  const slots = Array.isArray(input.wardrobe_slots) ? input.wardrobe_slots.filter((s) => SLOTS.includes(s)) : [];

  const row = {
    ...base,
    title: c.str(input, "title", { min: 1, max: 80 }),
    tagline: c.str(input, "tagline", { max: 120 }),
    quote: c.str(input, "quote", { max: 200 }),
    edition: c.oneOf(input, "edition", EDITIONS, "companion"),
    edition_label: c.str(input, "edition_label", { max: 40 }),
    pack: c.oneOf(input, "pack", PACKS, "wild"),
    art,
    attributes,
    wardrobe_slots: slots,
    image_url: c.url(input.image_url, "image_url"),
    ...listing(c, input),
  };
  c.done();
  return row;
}

export { Checker };
