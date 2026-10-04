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
import { getWearableTypes } from "../../services/marketplace/catalog";

function Wardrobe() {
  const [params, setParams] = useSearchParams();
  const { edition } = useEdition();
  const { characters } = useCharacters();
  const { wearables, loading, error } = useWearables();
  const { connected, ownsWearable, countOwned } = useCollection();

  const types = getWearableTypes();
  const type = types.some((t) => t.id === params.get("type")) ? params.get("type") : null;
  const ownedOnly = connected && params.get("owned") === "1";

  const wearable = (id) => wearables.find((w) => w.id === id);
  const linked = params.get("item");

  // Fitting-room state: one item per slot, plus the item whose details show.
  const [characterId, setCharacterId] = useState(edition === "dev" ? "cyber" : "yeti");
  const [slots, setSlots] = useState({});
  const [focusedId, setFocusedId] = useState(null);

  // Arriving via /wardrobe?item=… tries that item on.
  const [appliedLink, setAppliedLink] = useState(null);
  if (linked && linked !== appliedLink && wearable(linked)) {
    setAppliedLink(linked);
    setSlots((s) => ({ ...s, [wearable(linked).type]: linked }));
    setFocusedId(linked);
  }

  const dressable = characters.filter((c) => c.art.kind === "character");
  const character = dressable.find((c) => c.id === characterId) ?? dressable[0];
  const worn = Object.values(slots)
    .map(wearable)
    .filter((w) => w && character && w.compatibleCharacters.includes(character.id));
  const focused = wearable(focusedId) ?? worn.at(-1) ?? null;

  const toggle = (w) => {
    setFocusedId(w.id);
    setSlots((s) => {
      const next = { ...s };
      if (next[w.type] === w.id) delete next[w.type];
      else next[w.type] = w.id;
      return next;
    });
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
        Try anything on, then make it yours. Every piece is an NFT that fits Yeti and Cyber.
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
                  selected={slots[w.type] === w.id}
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
