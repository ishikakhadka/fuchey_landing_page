import { callFunction, select } from "./client";
import { NETWORK } from "../../config/network";

// Home page content managed in the admin: pack drops, the hero carousel and
// home settings (supabase/migrations/20261115000000_home_content.sql).
// The public site only ever sees live drops and enabled slides (RLS).

export const HOME_SECTIONS = [
  ["stats", "Stats strip"],
  ["parade", "Character parade"],
  ["howItWorks", "How Fuchey works"],
  ["upcoming", "Upcoming drops"],
  ["onSale", "On sale now"],
  ["companion", "Physical companion"],
  ["waitlist", "Waitlist"],
];

export const DEFAULT_HOME_SETTINGS = {
  autoplaySeconds: 7,
  sections: Object.fromEntries(HOME_SECTIONS.map(([id]) => [id, true])),
  // Character lists are ids only; everything else comes from the catalogue.
  parade: { characterIds: [], seconds: 60 },
  showcase: { defaultPack: "", packs: {} },
  priceDisplay: "sol",
};

export function rowToDrop(r) {
  return {
    id: r.id,
    pack: r.pack,
    title: r.title,
    label: r.label ?? "",
    headline: r.headline ?? "",
    headlineAccent: r.headline_accent ?? "",
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    backdropUrl: r.backdrop_url || null,
    characterIds: r.character_ids ?? [],
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    live: r.live,
    showInHero: r.show_in_hero,
    showInUpcoming: r.show_in_upcoming,
    showBanner: r.show_banner,
    ctaLabel: r.cta_label ?? "",
    ctaHref: r.cta_href ?? "",
    sortOrder: r.sort_order ?? 0,
  };
}

export function dropToRow(d) {
  return {
    id: d.id,
    pack: d.pack,
    title: d.title,
    label: d.label,
    headline: d.headline,
    headline_accent: d.headlineAccent,
    tagline: d.tagline,
    description: d.description,
    backdrop_url: d.backdropUrl || null,
    character_ids: d.characterIds,
    starts_at: d.startsAt || null,
    ends_at: d.endsAt || null,
    live: d.live,
    show_in_hero: d.showInHero,
    show_in_upcoming: d.showInUpcoming,
    show_banner: d.showBanner,
    cta_label: d.ctaLabel,
    cta_href: d.ctaHref,
    sort_order: d.sortOrder,
  };
}

export function rowToSlide(r) {
  return {
    id: r.id,
    kind: r.kind,
    dropId: r.drop_id,
    eyebrow: r.eyebrow ?? "",
    title: r.title ?? "",
    titleAccent: r.title_accent ?? "",
    body: r.body ?? "",
    imageUrl: r.image_url || null,
    ctaLabel: r.cta_label ?? "",
    ctaHref: r.cta_href ?? "",
    enabled: r.enabled,
    sortOrder: r.sort_order ?? 0,
  };
}

export function slideToRow(s) {
  return {
    id: s.id,
    kind: s.kind,
    drop_id: s.kind === "drop" ? s.dropId : null,
    eyebrow: s.eyebrow,
    title: s.title,
    title_accent: s.titleAccent,
    body: s.body,
    image_url: s.imageUrl || null,
    cta_label: s.ctaLabel,
    cta_href: s.ctaHref,
    enabled: s.enabled,
    sort_order: s.sortOrder,
  };
}

const withDefaults = (value) => ({
  ...DEFAULT_HOME_SETTINGS,
  ...(value ?? {}),
  sections: { ...DEFAULT_HOME_SETTINGS.sections, ...(value?.sections ?? {}) },
  parade: { ...DEFAULT_HOME_SETTINGS.parade, ...(value?.parade ?? {}) },
  showcase: { ...DEFAULT_HOME_SETTINGS.showcase, ...(value?.showcase ?? {}), packs: value?.showcase?.packs ?? {} },
});

// Public read. Each part fails soft, so a backend without these tables yet
// still renders the home page (scratch card only, no drops).
export async function fetchHomeContent() {
  const [drops, slides, settings] = await Promise.all([
    select("drops", { order: "sort_order.asc,id.asc" }).catch(() => []),
    select("home_slides", { order: "sort_order.asc,id.asc" }).catch(() => null),
    select("site_settings", { key: "eq.home" }).catch(() => []),
  ]);
  return {
    drops: drops.map(rowToDrop),
    // No slides table yet → just the scratch card, as before.
    slides: slides ? slides.map(rowToSlide) : [{ id: "scratch", kind: "scratch", enabled: true, sortOrder: 0 }],
    settings: withDefaults(settings[0]?.value),
  };
}

// ---- admin -----------------------------------------------------------------

export async function adminListContent(session) {
  const { drops, slides, settings } = await callFunction("admin", { action: "listContent" }, session);
  return { drops: drops.map(rowToDrop), slides: slides.map(rowToSlide), settings: withDefaults(settings) };
}

export async function adminSaveDrop(session, drop) {
  const { drop: row } = await callFunction("admin", { action: "saveDrop", drop: dropToRow(drop), network: NETWORK.id }, session);
  return rowToDrop(row);
}

export const adminDeleteDrop = (session, id) => callFunction("admin", { action: "deleteDrop", id }, session);

export async function adminSaveSlide(session, slide) {
  const { slide: row } = await callFunction("admin", { action: "saveSlide", slide: slideToRow(slide) }, session);
  return rowToSlide(row);
}

export const adminDeleteSlide = (session, id) => callFunction("admin", { action: "deleteSlide", id }, session);
export const adminOrderSlides = (session, ids) => callFunction("admin", { action: "orderSlides", ids }, session);

export async function adminSaveHomeSettings(session, settings) {
  const res = await callFunction("admin", { action: "saveHomeSettings", settings }, session);
  return withDefaults(res.settings);
}
