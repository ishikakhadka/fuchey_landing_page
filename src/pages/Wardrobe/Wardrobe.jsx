import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Backpack,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Glasses,
  Hand,
  HardHat,
  LayoutGrid,
  RotateCcw,
  Shirt,
  Sparkles,
  Star,
} from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import CharacterRender from "../../components/characters/CharacterRender";
import RarityBadge from "../../components/marketplace/RarityBadge";
import PriceTag from "../../components/marketplace/PriceTag";
import WalletButton from "../../components/wallet/WalletButton";
import EmptyState from "../../components/collection/EmptyState";

import { useCatalog } from "../../context/CatalogContext";
import { useCharacters } from "../../hooks/useCharacters";
import { useWearablePacks, useWearables } from "../../hooks/useWearables";
import { useCollection } from "../../hooks/useCollection";
import { useAsync } from "../../hooks/useAsync";
import { useWallet } from "../../hooks/useWallet";
import { fitsCharacter, getWearableTypes, isDressable } from "../../services/marketplace/catalog";
import { fetchLoadout, saveLoadout } from "../../services/backend/loadouts";
import { getSession } from "../../services/backend/session";
import { packBackdrop, packs } from "../../data/packs";
import { detailPath } from "../../utils/routes";

const TYPE_ICONS = {
  hat: Crown,
  headwear: HardHat,
  outfit: Shirt,
  accessory: Glasses,
  backpack: Backpack,
  held: Hand,
  special: Star,
};

const sameSlots = (a = {}, b = {}) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

// Links that open the fitting room straight away (try an item on, dress a
// character, your own wardrobe, a filtered rail) skip the pack grid.
const ROOM_PARAMS = ["item", "look", "character", "view", "type", "owned"];

// /wardrobe                → the wardrobe's packs
// /wardrobe/packs/:packId  → the fitting room with that pack's rack
// /wardrobe?item=… etc.    → redirects into the pack that link is about
function Wardrobe() {
  const { packId } = useParams();
  const [params] = useSearchParams();

  if (packId) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) {
      return (
        <div className="container market-page">
          <EmptyState
            title="This rack is empty."
            action={
              <Link to="/wardrobe" className="ghost-button">
                <ArrowLeft size={16} /> All packs
              </Link>
            }>
            We couldn’t find a wardrobe pack called “{packId}”.
          </EmptyState>
        </div>
      );
    }
    return <FittingRoomPage key={pack.id} pack={pack} />;
  }

  if (ROOM_PARAMS.some((key) => params.has(key))) return <ToPack />;
  return <WardrobePacks />;
}

// A fitting-room link without a pack (/wardrobe?character=warrior&look=…,
// ?item=…, ?view=mine) opens in the pack it's about, so the room only shows
// that pack's characters and pieces — everything on the rack fits. The item
// decides first, then the character, then the look; otherwise Wild.
function ToPack() {
  const [params] = useSearchParams();
  const { characters, wearables, loading } = useCatalog();
  if (loading) return <div className="container market-page" aria-busy="true" />;

  const item = wearables.find((w) => w.id === params.get("item"));
  const character = characters.find((c) => c.id === params.get("character"));
  const lookPiece = wearables.find((w) => w.id === params.get("look")?.split(",")[0]);
  const packId = (item ?? character ?? lookPiece)?.pack ?? "wild";

  const next = new URLSearchParams(params);
  // A character from another pack can't wear the linked item: let the room
  // pick one of the item's own characters instead.
  if (item && character && (character.pack ?? "wild") !== packId) next.delete("character");
  const query = next.toString();
  return <Navigate replace to={`/wardrobe/packs/${packId}${query ? `?${query}` : ""}`} />;
}

function WardrobePacks() {
  const { packs: grouped, loading, error } = useWearablePacks();
  const { ownsWearable } = useCollection();

  return (
    <div className="rd-page wr-page">
      <section className="container wr-intro">
        <span className="eyebrow">Wardrobe</span>
        <h1 className="rd-title">
          Dress Your <span className="accent">Fuchey</span>
        </h1>
        <p className="rd-lede">Every pack has its own rack. Pick one, try pieces on your character and save the look to your wallet.</p>
      </section>

      {error && <p className="market-error container">Couldn’t load the wardrobe. Try refreshing.</p>}

      <div className="container wr-racks" aria-busy={loading}>
        {grouped.map((p) => {
          const shown = p.items.filter((w) => !w.art.locked).slice(0, 4);
          const owned = p.items.filter((w) => ownsWearable(w.id)).length;
          return (
            <Link key={p.id} to={`/wardrobe/packs/${p.id}`} className="wr-rack">
              <img className="wr-rack-bg" src={packBackdrop(p)} alt="" />
              <span className="wr-rack-shade" aria-hidden="true" />
              <span className="wr-rack-items">
                {shown.map((w) => (
                  <span key={w.id} className="wr-rack-tile">
                    <ItemArt art={w.art} alt="" itemId={w.id} item={w} size="sm" />
                  </span>
                ))}
              </span>
              <span className="wr-rack-meta">
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.items.length} {p.items.length === 1 ? "piece" : "pieces"}
                    {owned ? ` · ${owned} owned` : ""}
                  </small>
                </span>
                <span className="wr-rack-cta">Open rack</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FittingRoomPage({ pack }) {
  const [params, setParams] = useSearchParams();
  const { characters } = useCharacters();
  const { wearables, loading, error } = useWearables();
  const { connected, address, ownsWearable, countOwned, loading: ownedLoading } = useCollection();
  const { signer } = useWallet();

  const types = getWearableTypes();
  const type = types.some((t) => t.id === params.get("type")) ? params.get("type") : null;
  const ownedOnly = connected && params.get("owned") === "1";

  const wearable = (id) => wearables.find((w) => w.id === id);
  const linked = params.get("item");

  // A pack's fitting room dresses that pack's own characters.
  const dressable = characters.filter((c) => isDressable(c) && (c.pack ?? "wild") === pack.id);
  // /wardrobe?character=… (from "Dress it up") opens on that character.
  const [characterId, setCharacterId] = useState(
    params.get("character") ?? (pack.id !== "wild" ? null : "yeti"),
  );
  const character = dressable.find((c) => c.id === characterId) ?? dressable[0];

  // view=mine: just the wearables this wallet owns that fit the character,
  // until "Explore more" opens the full rail. Owning and fitting are two
  // separate checks (ownsWearable / fitsCharacter).
  const mineView = connected && params.get("view") === "mine";

  // Fitting-room state: per character, one wearable id per slot
  // ({ [characterId]: { [slot]: wearableId } }), plus the item whose details show.
  const [looks, setLooks] = useState({});
  const [focusedId, setFocusedId] = useState(null);
  const slots = (character && looks[character.id]) ?? {};
  const setSlots = (update) =>
    setLooks((all) => ({ ...all, [character.id]: update(all[character.id] ?? {}) }));

  // The connected wallet's saved loadout for this character, applied once
  // unless the user has already started dressing it.
  const loadoutKey = address && character ? `${address}:${character.id}` : null;
  const saved = useAsync(
    () => (loadoutKey ? fetchLoadout(address, character.id) : Promise.resolve(null)),
    loadoutKey ?? "none",
  );
  const [appliedLoadouts, setAppliedLoadouts] = useState([]);
  if (loadoutKey && saved.data && !appliedLoadouts.includes(loadoutKey) && !looks[character.id]) {
    setAppliedLoadouts((keys) => [...keys, loadoutKey]);
    setLooks((all) => ({ ...all, [character.id]: saved.data }));
  }

  // Arriving via /wardrobe?item=… tries that item on (switching to a
  // character it fits if the current one can't wear it).
  const [appliedLink, setAppliedLink] = useState(null);
  if (linked && linked !== appliedLink && wearable(linked) && character) {
    const item = wearable(linked);
    const target = fitsCharacter(item, character.id)
      ? character
      : dressable.find((c) => fitsCharacter(item, c.id));
    setAppliedLink(linked);
    if (target) {
      setCharacterId(target.id);
      setLooks((all) => ({ ...all, [target.id]: { ...(all[target.id] ?? {}), [item.type]: item.id } }));
    }
    setFocusedId(linked);
  }

  // Arriving via /wardrobe?character=…&look=a,b,c (from the home page's
  // dressing room) puts that whole look on, keeping only pieces that fit.
  const lookParam = params.get("look");
  const [appliedLook, setAppliedLook] = useState(null);
  if (lookParam && lookParam !== appliedLook && character && wearables.length) {
    const pieces = lookParam
      .split(",")
      .map(wearable)
      .filter((w) => w && fitsCharacter(w, character.id));
    setAppliedLook(lookParam);
    setLooks((all) => ({ ...all, [character.id]: Object.fromEntries(pieces.map((w) => [w.type, w.id])) }));
    if (pieces.length) setFocusedId(pieces.at(-1).id);
  }

  const worn = Object.values(slots)
    .map(wearable)
    .filter((w) => w && character && fitsCharacter(w, character.id));
  const focused = wearable(focusedId) ?? worn.at(-1) ?? null;

  // Only compatible wearables can be equipped; others stay viewable.
  const toggle = (w) => {
    setFocusedId(w.id);
    if (!fitsCharacter(w, character?.id)) return;
    setSlots((s) => {
      const next = { ...s };
      if (next[w.type] === w.id) delete next[w.type];
      else next[w.type] = w.id;
      return next;
    });
  };

  // Saving the loadout stores ids only; the NFTs never move.
  const [saveState, setSaveState] = useState({ key: null, status: "idle", message: null });
  const currentSlots = Object.fromEntries(worn.map((w) => [w.type, w.id]));
  const savedSlots = saved.data ?? {};
  const status = saveState.key === loadoutKey ? saveState : { status: "idle" };
  const dirty = !sameSlots(currentSlots, status.status === "saved" ? status.slots : savedSlots);

  const save = async () => {
    const key = loadoutKey;
    setSaveState({ key, status: "saving" });
    try {
      const session = await getSession("loadout", signer);
      const slotsSaved = await saveLoadout({ characterId: character.id, slots: currentSlots, session });
      setSaveState({ key, status: "saved", slots: slotsSaved });
    } catch (error) {
      setSaveState({ key, status: "error", message: error.message ?? "Couldn’t save your look." });
    }
  };

  const racked = wearables.filter((w) => (w.pack ?? "wild") === pack.id);
  const rail = mineView
    ? racked.filter((w) => ownsWearable(w.id) && fitsCharacter(w, character?.id))
    : racked;

  // Only show the types this rack actually has.
  const tabs = [
    { id: null, label: "All", count: rail.length },
    ...types
      .map((t) => ({ ...t, count: rail.filter((w) => w.type === t.id).length }))
      .filter((t) => t.count || t.id === type),
  ];

  const visible = rail.filter(
    (w) => (!type || w.type === type) && (mineView || !ownedOnly || ownsWearable(w.id)),
  );

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const exploreMore = (
    <button type="button" className="primary-button" onClick={() => update("view", null)}>
      <Compass size={16} /> Explore more
    </button>
  );

  const typeIcon = (id) => TYPE_ICONS[id] ?? Sparkles;
  const roomTabs = tabs.map((t) => ({ ...t, label: t.id ? t.label : "Everything" }));
  const at = dressable.findIndex((c) => c.id === character?.id);
  const cycleCharacter = (dir) => {
    if (dressable.length < 2) return;
    setCharacterId(dressable[(at + dir + dressable.length) % dressable.length].id);
  };
  const reset = () => character && setSlots(() => ({}));

  return (
    <div className="rd-page wr-page wr-room">
      <div className="wr-backdrop" aria-hidden="true">
        <img src={packBackdrop(pack)} alt="" />
      </div>

      <div className="container wr-room-grid">
        {/* Left: title and categories */}
        <aside className="wr-side">
          <Link to="/wardrobe" className="wr-back">
            <ArrowLeft size={15} /> {pack.name}
          </Link>
          <h1 className="rd-title">
            Your <span className="accent">Wardrobe</span>
          </h1>
          <p className="wr-sub">Dress up, express and make it yours.</p>

          <nav className="wr-cats" aria-label="Wearable type">
            {roomTabs.map((t) => {
              const Icon = t.id ? typeIcon(t.id) : LayoutGrid;
              const on = (type ?? null) === t.id;
              return (
                <button key={t.id ?? "all"} type="button" className={on ? "is-on" : ""} aria-pressed={on} onClick={() => update("type", t.id)}>
                  <Icon size={20} aria-hidden="true" />
                  <span>{t.label}</span>
                  {on && <ChevronRight size={18} className="wr-cats-chev" aria-hidden="true" />}
                </button>
              );
            })}
          </nav>

          {connected && !mineView && (
            <label className="owned-toggle wr-owned">
              <input type="checkbox" checked={ownedOnly} onChange={(e) => update("owned", e.target.checked ? "1" : null)} />
              <span className="owned-toggle-track" aria-hidden="true" />
              Only what I own
            </label>
          )}
        </aside>

        {/* Middle: the character on its stage */}
        <section className="wr-stage" aria-label="Fitting room">
          <span className="wr-stage-ring is-outer" aria-hidden="true" />
          <span className="wr-stage-ring" aria-hidden="true" />
          <span className="wr-stage-base" aria-hidden="true" />
          <span className="wr-stage-glow" aria-hidden="true" />
          {character && (
            <CharacterRender
              dressing
              art={character.art}
              characterId={character.id}
              equipped={worn}
              alt={`${character.name} wearing ${worn.map((w) => w.name).join(", ") || "nothing extra"}`}
              className="wr-stage-art"
            />
          )}
          {character && (
            <div className="wr-who">
              {dressable.length > 1 && (
                <button type="button" aria-label="Previous character" onClick={() => cycleCharacter(-1)}>
                  <ChevronLeft size={16} />
                </button>
              )}
              <Star size={16} className="wr-who-star" aria-hidden="true" />
              <b>{character.name}</b>
              <span className="wr-who-sep" aria-hidden="true" />
              <RarityBadge rarity={character.rarity} />
              {dressable.length > 1 && (
                <button type="button" aria-label="Next character" onClick={() => cycleCharacter(1)}>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* Right: the rack */}
        <section className="wr-rack-grid" aria-label="Wearables" aria-busy={loading || (mineView && ownedLoading)}>
          {mineView && (
            <div className="wr-mine-head">
              <span>Wearables you own that fit {character?.name ?? "this character"}.</span>
              {exploreMore}
            </div>
          )}
          {error && <p className="market-error">Couldn’t load the wardrobe. Try refreshing.</p>}

          {!loading && !(mineView && ownedLoading) && visible.length === 0 ? (
            <EmptyState title={mineView ? "Nothing here fits yet." : "Nothing on this rail yet."} action={mineView ? exploreMore : null}>
              {mineView
                ? "Browse the full wardrobe to try pieces on and pick some up."
                : ownedOnly
                  ? "You don’t own anything in this category yet."
                  : "New pieces drop regularly — check back soon."}
            </EmptyState>
          ) : (
            <div className="wr-tiles">
              {visible.map((w) => {
                const fits = !character || fitsCharacter(w, character.id);
                const on = slots[w.type] === w.id && fits;
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`wr-tile rarity-${w.rarity} ${on ? "is-on" : ""} ${fits ? "" : "is-off"}`}
                    aria-pressed={on}
                    title={fits ? undefined : `Doesn’t fit ${character.name}`}
                    onClick={() => toggle(w)}>
                    {on && (
                      <span className="wr-tile-check" aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                    {ownsWearable(w.id) && <span className="wr-tile-owned">Owned</span>}
                    <span className="wr-tile-art">
                      <ItemArt art={w.art} alt="" itemId={w.id} item={w} size="md" />
                    </span>
                    <span className="wr-tile-name">{w.name}</span>
                    <RarityBadge rarity={w.rarity} />
                    {on && (
                      <span className="wr-tile-equipped">
                        <Check size={14} strokeWidth={3} /> Equipped
                      </span>
                    )}
                    {!fits && <span className="wr-tile-nofit">Doesn’t fit {character.name}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {focused && (
            <div className="wr-focus">
              <span>
                <b>{focused.name}</b>
                <PriceTag listing={focused.listing} size="sm" />
                {countOwned(focused.id) > 0 && <small>You own {countOwned(focused.id)}</small>}
              </span>
              <Link to={detailPath(focused, "wearable")} className="rd-link">
                View &amp; get it <ChevronRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Bottom: what's on, reset, save */}
      <div className="container">
        <div className="wr-bar">
          <span className="wr-bar-label">Equipped Items:</span>
          <ul className="wr-bar-items">
            {worn.length === 0 && <li className="wr-bar-empty">Tap an item to try it on.</li>}
            {worn.map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => toggle(w)} aria-label={`Take off ${w.name}`}>
                  <span className="wr-bar-art">
                    <ItemArt art={w.art} alt="" itemId={w.id} item={w} size="sm" />
                  </span>
                  <span className="wr-bar-text">
                    <b>{w.name}</b>
                    <RarityBadge rarity={w.rarity} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="wr-bar-actions">
            <button type="button" className="rd-btn is-ghost" onClick={reset} disabled={!worn.length}>
              <RotateCcw size={17} /> Reset
            </button>
            {connected ? (
              <button type="button" className="rd-btn is-primary" onClick={save} disabled={!dirty || status.status === "saving"}>
                <Check size={18} /> {status.status === "saving" ? "Saving…" : status.status === "saved" && !dirty ? "Saved" : "Save Outfit"}
              </button>
            ) : (
              <WalletButton />
            )}
          </div>
          {status.status === "error" && <p className="wr-bar-error">{status.message}</p>}
          {!connected && <p className="wr-bar-note">Connect a wallet to save this outfit. Trying things on is free.</p>}
        </div>
      </div>
    </div>
  );
}

export default Wardrobe;
