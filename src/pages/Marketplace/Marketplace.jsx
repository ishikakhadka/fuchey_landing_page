import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { RefreshCw, Search, X } from "lucide-react";

import PageHeader from "../../components/marketplace/PageHeader";
import CategoryTabs from "../../components/marketplace/CategoryTabs";
import CollectibleCard from "../../components/marketplace/CollectibleCard";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";

import { useCatalog } from "../../context/CatalogContext";
import { useMarketplace } from "../../context/MarketplaceContext";
import { useCollection } from "../../hooks/useCollection";
import { liveListing } from "../../hooks/useListing";
import { getAvailability, AVAILABILITY } from "../../utils/listing";
import { getRarity, getWearableTypeLabel } from "../../services/marketplace/catalog";
import { RARITIES } from "../../data/taxonomy";
import { getPack, packs } from "../../data/packs";
import { NETWORK } from "../../config/network";

const KINDS = [
  { id: null, label: "All Collectibles" },
  { id: "characters", label: "Characters" },
  { id: "wearables", label: "Wearables" },
];

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rarity", label: "Rarity: rarest first" },
  { id: "name", label: "Name: A–Z" },
];

// Prices that aren't set yet (TBA) always sort last.
const byPrice = (dir) => (a, b) => {
  const pa = a.item.listing.price;
  const pb = b.item.listing.price;
  if (pa == null || pb == null) return (pa == null) - (pb == null);
  return (pa - pb) * dir;
};

const COMPARE = {
  featured: (a, b) => a.availability.rank - b.availability.rank || a.order - b.order,
  "price-asc": byPrice(1),
  "price-desc": byPrice(-1),
  rarity: (a, b) => getRarity(b.item.rarity).rank - getRarity(a.item.rarity).rank || a.order - b.order,
  name: (a, b) => a.item.name.localeCompare(b.item.name),
};

const FILTER_KEYS = ["q", "availability", "rarity", "pack"];

// /marketplace — browse every published character and wearable. All state is
// in the URL (?kind=…&q=…&sort=…&availability=…&rarity=…&pack=…) so a view
// can be shared or bookmarked.
function Marketplace() {
  const [params, setParams] = useSearchParams();
  const { characters, wearables, loading, error, reload } = useCatalog();
  const market = useMarketplace();
  const { ownsCharacter, ownsWearable } = useCollection();

  const kind = KINDS.some((k) => k.id === params.get("kind")) ? params.get("kind") : null;
  const sort = SORTS.some((s) => s.id === params.get("sort")) ? params.get("sort") : "featured";
  const q = params.get("q") ?? "";
  const availability = AVAILABILITY[params.get("availability")] ? params.get("availability") : "";
  const rarity = RARITIES[params.get("rarity")] ? params.get("rarity") : "";
  const pack = packs.some((p) => p.id === params.get("pack")) ? params.get("pack") : "";

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((key) => next.delete(key));
    setParams(next, { replace: true });
  };
  const filtering = FILTER_KEYS.some((key) => params.get(key));

  // Every item with what the filters need: its kind, availability and
  // catalogue order. Availability comes from the verified sale + live supply.
  const entries = useMemo(
    () => [
      ...characters.map((item, order) => ({ item, kind: "character", order })),
      ...wearables.map((item, order) => ({ item, kind: "wearable", order })),
    ].map((e) => ({ ...e, availability: getAvailability(e.item, liveListing(market, e.item)) })),
    [characters, wearables, market],
  );

  const needle = q.trim().toLowerCase();
  const matches = (e) =>
    (!availability || e.availability.id === availability) &&
    (!rarity || getRarity(e.item.rarity).id === rarity) &&
    (!pack || getPack(e.item.pack).id === pack) &&
    (!needle ||
      [e.item.name, e.item.title, e.item.tagline, e.item.description, getPack(e.item.pack).name,
        e.kind === "wearable" ? getWearableTypeLabel(e.item.type) : "character"]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(needle)));

  const filtered = entries.filter(matches).sort(COMPARE[sort]);
  const groups = [
    { id: "characters", title: "Characters", items: filtered.filter((e) => e.kind === "character") },
    { id: "wearables", title: "Wearables", items: filtered.filter((e) => e.kind === "wearable") },
  ].filter((g) => !kind || g.id === kind);
  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  const tabs = KINDS.map((k) => ({
    ...k,
    count: loading ? null : entries.filter(matches).filter((e) => !k.id || `${e.kind}s` === k.id).length,
  }));

  // Only offer availability options that some item actually has.
  const availabilityOptions = Object.values(AVAILABILITY)
    .sort((a, b) => a.rank - b.rank)
    .filter((a) => a.id === availability || entries.some((e) => e.availability.id === a.id));

  const owned = (e) => (e.kind === "character" ? ownsCharacter(e.item.id) : ownsWearable(e.item.id));

  return (
    <div className="container market-page market-browse">
      <PageHeader
        eyebrow="MARKETPLACE"
        title="The collection."
        aside={
          <div className="browse-network">
            <NetworkBadge />
            {!NETWORK.isMainnet && <span>Test network: prices are in {NETWORK.label} SOL.</span>}
          </div>
        }>
        Every Fuchey character and wearable, with live availability. Open any piece to see its
        details, on-chain record and what it pairs with.
      </PageHeader>

      <div className="browse-toolbar">
        <CategoryTabs label="Collectible type" options={tabs} value={kind} onChange={(id) => update("kind", id)} />

        <div className="browse-controls">
          <label className="browse-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search the collection</span>
            <input
              type="search"
              placeholder="Search characters, wearables, packs…"
              value={q}
              onChange={(e) => update("q", e.target.value)}
            />
            {q && (
              <button type="button" aria-label="Clear search" onClick={() => update("q", null)}>
                <X size={14} />
              </button>
            )}
          </label>

          <label className="browse-select">
            <span>Sort</span>
            <select value={sort} onChange={(e) => update("sort", e.target.value === "featured" ? null : e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="browse-select">
            <span>Status</span>
            <select value={availability} aria-label="Availability" onChange={(e) => update("availability", e.target.value)}>
              <option value="">Any</option>
              {availabilityOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="browse-select">
            <span>Rarity</span>
            <select value={rarity} onChange={(e) => update("rarity", e.target.value)}>
              <option value="">Any</option>
              {Object.values(RARITIES).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="browse-select">
            <span>Pack</span>
            <select value={pack} onChange={(e) => update("pack", e.target.value)}>
              <option value="">All packs</option>
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="market-error" role="alert">
          Couldn’t load the collection.{" "}
          <button type="button" className="text-link" onClick={reload}>
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="collectible-grid" aria-busy="true" aria-label="Loading the collection">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="collectible-card is-skeleton">
              <span className="collectible-art skeleton-block" />
              <span className="collectible-body">
                <span className="skeleton-line" style={{ width: "45%" }} />
                <span className="skeleton-line is-lg" style={{ width: "70%" }} />
                <span className="skeleton-line" style={{ width: "55%" }} />
              </span>
            </div>
          ))}
        </div>
      ) : !error && shown === 0 ? (
        <EmptyState
          title={filtering ? "Nothing matches those filters." : "Nothing here yet."}
          action={
            filtering && (
              <button type="button" className="ghost-button" onClick={clearFilters}>
                <X size={15} /> Clear filters
              </button>
            )
          }>
          {filtering
            ? "Try a different search, or widen the availability, rarity or pack."
            : "New characters and wearables are on the way. Check back soon."}
        </EmptyState>
      ) : (
        <>
          <p className="browse-count" aria-live="polite">
            {shown} {shown === 1 ? "collectible" : "collectibles"}
            {filtering && (
              <button type="button" className="text-link" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </p>

          {groups
            .filter((g) => g.items.length)
            .map((group) => (
              <section key={group.id} className="browse-group" aria-label={group.title}>
                {!kind && (
                  <h2 className="details-heading">
                    {group.title} <span className="muted">{group.items.length}</span>
                  </h2>
                )}
                <div className="collectible-grid">
                  {group.items.map((e) => (
                    <CollectibleCard key={`${e.kind}-${e.item.id}`} item={e.item} kind={e.kind} owned={owned(e)} />
                  ))}
                </div>
              </section>
            ))}
        </>
      )}
    </div>
  );
}

export default Marketplace;
