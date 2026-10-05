// NFT metadata built from the Fuchey asset row — one source of truth, no
// second attribute system. Only public, descriptive fields go in: no listing
// config, no admin data, no render layers (those stay in the app; an NFT says
// *what* it is, Fuchey decides how it's drawn and what it fits).

import { COLLECTION_GROUPS, SYMBOL, type AssetKind } from "./config.ts";

const RARITY: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};
const SLOT: Record<string, string> = {
  hat: "Hat",
  headwear: "Headwear",
  outfit: "Outfit",
  accessory: "Accessory",
  backpack: "Backpack",
  held: "Held Item",
  special: "Special",
};
const EDITION: Record<string, string> = { companion: "Companion", dev: "Dev" };

type Row = Record<string, unknown> & { id: string; name: string };
type Attr = { trait_type: string; value: string };

export function nftName(kind: AssetKind, row: Row) {
  return kind === "character" ? String(row.title || row.name) : `Fuchey ${row.name}`;
}

// Problems that block minting, in the admin form's "field: message" format.
export function mintProblems(kind: AssetKind, row: Row): string[] {
  const p: string[] = [];
  const need = (key: string, msg = "required before minting") => {
    const v = row[key];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) p.push(`${key}: ${msg}`);
  };
  need("name");
  need("description");
  need("rarity");
  need("image_url", "upload the NFT artwork before minting");
  need("supply", "set an edition size before minting");
  if (row.price == null) p.push("price: set a price (0 = free claim) before minting");
  if (kind === "character") {
    need("title");
    need("edition");
  } else {
    need("type");
    need("compatible_characters", "pick at least one compatible character before minting");
  }
  return p;
}

// Link back to the item on the marketplace (FUCHEY_SITE_URL; omitted when unset).
function externalUrl(kind: AssetKind, id: string) {
  const site = Deno.env.get("FUCHEY_SITE_URL")?.replace(/\/$/, "");
  if (!site) return {};
  return { external_url: kind === "character" ? `${site}/characters/${id}` : `${site}/wardrobe?item=${id}` };
}

export function buildMetadata(kind: AssetKind, row: Row, image: { uri: string; url: string }) {
  const attributes: Attr[] = [
    { trait_type: "Asset Type", value: kind === "character" ? "Character" : "Wearable" },
    { trait_type: "Fuchey ID", value: row.id },
    { trait_type: "Rarity", value: RARITY[String(row.rarity)] ?? String(row.rarity) },
  ];
  if (kind === "character") {
    attributes.push({ trait_type: "Edition", value: String(row.edition_label || EDITION[String(row.edition)] || row.edition) });
  } else {
    attributes.push({ trait_type: "Wearable Type", value: SLOT[String(row.type)] ?? String(row.type) });
  }

  // The asset's own attributes, skipping any that would repeat a trait above.
  const taken = new Set(attributes.map((a) => a.trait_type.toLowerCase()));
  for (const a of (row.attributes as Attr[] | undefined) ?? []) {
    if (!a?.trait_type || a.value == null || taken.has(a.trait_type.toLowerCase())) continue;
    taken.add(a.trait_type.toLowerCase());
    attributes.push({ trait_type: a.trait_type, value: String(a.value) });
  }

  return {
    name: nftName(kind, row),
    symbol: SYMBOL,
    description: String(row.description ?? ""),
    // Wallets only display `image` if it's an https URL they can fetch — many
    // don't resolve ipfs:// — so it's the gateway URL. The ipfs:// URI (the
    // permanent content ID) is listed in `files`.
    image: image.url,
    ...externalUrl(kind, row.id),
    attributes,
    properties: {
      category: "image",
      files: [
        { uri: image.url, type: "image/png" },
        { uri: image.uri, type: "image/png" },
      ],
      fuchey: { assetType: kind, assetId: row.id, collection: COLLECTION_GROUPS[kind].id, version: 1 },
    },
  };
}
