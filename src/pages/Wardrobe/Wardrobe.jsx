import { useState } from "react";
import { useSearchParams } from "react-router";

import PageHeader from "../../components/marketplace/PageHeader";
import CategoryTabs from "../../components/marketplace/CategoryTabs";
import WearableCard from "../../components/wardrobe/WearableCard";
import FittingRoom from "../../components/wardrobe/FittingRoom";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";

import { useEdition } from "../../context/EditionContext";
import { useCharacters } from "../../hooks/useCharacters";
import { useWearables } from "../../hooks/useWearables";
import { useCollection } from "../../hooks/useCollection";
import { useAsync } from "../../hooks/useAsync";
import { useWallet } from "../../hooks/useWallet";
import { fitsCharacter, getWearableTypes } from "../../services/marketplace/catalog";
import { fetchLoadout, saveLoadout } from "../../services/backend/loadouts";
import { getSession } from "../../services/backend/session";

const sameSlots = (a = {}, b = {}) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

function Wardrobe() {
  const [params, setParams] = useSearchParams();
  const { edition } = useEdition();
  const { characters } = useCharacters();
  const { wearables, loading, error } = useWearables();
  const { connected, address, ownsWearable, countOwned } = useCollection();
  const { signer } = useWallet();

  const types = getWearableTypes();
  const type = types.some((t) => t.id === params.get("type")) ? params.get("type") : null;
  const ownedOnly = connected && params.get("owned") === "1";

  const wearable = (id) => wearables.find((w) => w.id === id);
  const linked = params.get("item");

  const dressable = characters.filter((c) => c.art.kind === "character");
  const [characterId, setCharacterId] = useState(edition === "dev" ? "cyber" : "yeti");
  const character = dressable.find((c) => c.id === characterId) ?? dressable[0];

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

  const tabs = [
    { id: null, label: "All", count: wearables.length },
    ...types.map((t) => ({ ...t, count: wearables.filter((w) => w.type === t.id).length })),
  ];

  const visible = wearables.filter(
    (w) => (!type || w.type === type) && (!ownedOnly || ownsWearable(w.id)),
  );

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="container market-page">
      <PageHeader eyebrow="WARDROBE" title="Dress the part." aside={<NetworkBadge />}>
        Try anything on, then make it yours. Every piece is an NFT, and each one lists the characters it fits.
      </PageHeader>

      <div className="wardrobe-layout">
        {character && (
          <FittingRoom
            characters={dressable}
            character={character}
            onCharacter={setCharacterId}
            worn={worn}
            onRemove={toggle}
            focused={focused}
            ownedCount={focused ? countOwned(focused.id) : 0}
            loadout={
              connected
                ? { onSave: save, dirty, status: status.status, message: status.message }
                : null
            }
          />
        )}

        <section className="wardrobe-rack" aria-label="Wearables">
          <div className="filter-bar">
            <CategoryTabs
              label="Wearable type"
              options={tabs}
              value={type}
              onChange={(id) => update("type", id)}
            />

            <label
              className={`owned-toggle ${connected ? "" : "is-disabled"}`}
              title={connected ? undefined : "Connect a wallet first"}>
              <input
                type="checkbox"
                checked={ownedOnly}
                disabled={!connected}
                onChange={(e) => update("owned", e.target.checked ? "1" : null)}
              />
              <span className="owned-toggle-track" aria-hidden="true" />
              Owned
            </label>
          </div>

          {error && <p className="market-error">Couldn’t load the wardrobe. Try refreshing.</p>}

          {!loading && visible.length === 0 ? (
            <EmptyState title="Nothing on this rail yet.">
              {ownedOnly
                ? "You don’t own anything in this category yet."
                : "New pieces drop regularly — check back soon."}
            </EmptyState>
          ) : (
            <div className="wearable-grid" aria-busy={loading}>
              {visible.map((w) => (
                <WearableCard
                  key={w.id}
                  wearable={w}
                  owned={ownsWearable(w.id)}
                  selected={slots[w.type] === w.id && fitsCharacter(w, character?.id)}
                  incompatible={character && !fitsCharacter(w, character.id) ? character.name : null}
                  onSelect={toggle}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Wardrobe;
