import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck } from "lucide-react";

import PageHeader from "../../components/marketplace/PageHeader";
import ItemArt from "../../components/marketplace/ItemArt";
import WalletButton from "../../components/wallet/WalletButton";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import EmptyState from "../../components/collection/EmptyState";

import { useWallet } from "../../hooks/useWallet";
import { useCatalog } from "../../context/CatalogContext";
import { backendConfigured } from "../../config/backend";
import { getPack } from "../../data/packs";
import { getWearableTypes, isDressable } from "../../services/marketplace/catalog";
import { adminList, adminSession } from "../../services/backend/admin";
import { cachedSession, clearSession, getSession } from "../../services/backend/session";
import { formatPrice } from "./format";
import WearableEditor from "./WearableEditor";
import CharacterEditor from "./CharacterEditor";
import NftRegistry from "./NftRegistry";
import NftDetail from "./NftDetail";
import { DropsAdmin, HomeAdmin } from "./ContentAdmin";
import PacksAdmin from "./PacksAdmin";
import StudioAdmin from "./StudioAdmin";
import ListControls from "./ListControls";
import { ALL, applyListView, emptyView, packOptions } from "./listView";
import { useContent } from "../../context/ContentContext";
import { newCharacter, newWearable } from "./drafts";
import "./admin.css";

// Catalogue admin: create and edit characters and wearables, place wearable
// art on the character with a live preview, and publish to the marketplace.
// Access: a wallet on the admins allowlist signs a sign-in message; the
// admin edge function checks both on every request.
function Admin() {
  const { connected, address, signer } = useWallet();
  const catalog = useCatalog();
  const content = useContent();

  const [auth, setAuth] = useState({ wallet: null, session: null, status: "idle", error: null });
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("wearables");
  const [editing, setEditing] = useState(null); // { kind, item }
  const [openNft, setOpenNft] = useState(null); // registry id
  const [waiting, setWaiting] = useState(null); // animator characters waiting for review
  // Search / pack / sort for each catalogue list; kept while editing, so "All wearables" returns to it.
  const [views, setViews] = useState({ wearables: { ...emptyView, sort: "order" }, characters: { ...emptyView, sort: "order" } });

  const session = auth.wallet === address ? auth.session : null;

  const signIn = async () => {
    setAuth({ wallet: address, session: null, status: "signing", error: null });
    try {
      const token = await getSession("admin", signer);
      await adminSession(token);
      setData(await adminList(token));
      setAuth({ wallet: address, session: token, status: "ready", error: null });
    } catch (error) {
      if (error.status === 401 || error.status === 403) clearSession("admin", address);
      setAuth({ wallet: address, session: null, status: "error", error: error.message ?? "Sign-in failed." });
    }
  };

  // Reuse this tab's earlier sign-in without asking the wallet again.
  useEffect(() => {
    const token = connected && address ? cachedSession("admin", address) : null;
    if (!token) return;
    let active = true;
    adminList(token).then(
      (list) => {
        if (!active) return;
        setData(list);
        setAuth({ wallet: address, session: token, status: "ready", error: null });
      },
      () => clearSession("admin", address),
    );
    return () => {
      active = false;
    };
  }, [connected, address]);

  if (!backendConfigured) {
    return (
      <div className="container market-page">
        <PageHeader eyebrow="ADMIN" title="Catalogue admin" />
        <EmptyState title="Backend not configured.">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see supabase/README.md).
        </EmptyState>
      </div>
    );
  }

  if (!connected || !session) {
    return (
      <div className="container market-page">
        <PageHeader eyebrow="ADMIN" title="Catalogue admin" aside={<NetworkBadge />} />
        <EmptyState
          title={connected ? "Sign in with your admin wallet." : "Connect your admin wallet."}
          action={
            connected ? (
              <button type="button" className="primary-button" onClick={() => signIn()} disabled={auth.status === "signing"}>
                <ShieldCheck size={17} /> {auth.status === "signing" ? "Check your wallet…" : "Sign in"}
              </button>
            ) : (
              <WalletButton />
            )
          }>
          Your wallet signs a one-time message to prove it’s on the admin list. It isn’t a transaction and costs nothing.
          {auth.error && <span className="admin-error admin-block">{auth.error}</span>}
          {connected && address && (
            <span className="admin-hint admin-block">
              Connected wallet: <code className="mono">{address}</code>
            </span>
          )}
        </EmptyState>
      </div>
    );
  }

  const refresh = async () => {
    setData(await adminList(session));
    catalog.reload();
  };

  const onSaved = (kind) => (item) => {
    const key = kind === "wearable" ? "wearables" : "characters";
    setData((d) => {
      const list = d[key].some((x) => x.id === item.id)
        ? d[key].map((x) => (x.id === item.id ? item : x))
        : [...d[key], item];
      // A wearable saved into a group: keep the groups list (and the group's name) current.
      const groups = d.groups ?? [];
      const nextGroups =
        kind === "wearable" && item.groupId
          ? [...groups.filter((g) => g.id !== item.groupId), { ...(groups.find((g) => g.id === item.groupId) ?? { pack: item.pack, type: item.type, sortOrder: 0 }), id: item.groupId, name: item.groupName || item.groupId }]
          : groups;
      const named = kind === "wearable" && item.groupId ? list.map((x) => (x.groupId === item.groupId ? { ...x, groupName: item.groupName } : x)) : list;
      return { ...d, [key]: named, groups: nextGroups };
    });
    setEditing({ kind, item });
    catalog.reload();
  };

  const onDeleted = () => {
    setEditing(null);
    refresh();
  };

  if (editing?.kind === "wearable") {
    return (
      <div className="container market-page admin-page">
        <WearableEditor
          key={editing.item.id || "new"}
          initial={editing.item}
          characters={data.characters}
          wearables={data.wearables}
          groups={data.groups ?? []}
          session={session}
          onSaved={onSaved("wearable")}
          onDeleted={onDeleted}
          onClose={() => setEditing(null)}
        />
      </div>
    );
  }

  if (editing?.kind === "character") {
    return (
      <div className="container market-page admin-page">
        <CharacterEditor
          key={editing.item.id || "new"}
          initial={editing.item}
          wearables={data.wearables}
          session={session}
          onSaved={onSaved("character")}
          onDeleted={onDeleted}
          onClose={() => setEditing(null)}
        />
      </div>
    );
  }

  if (tab === "nfts" && openNft) {
    return (
      <div className="container market-page admin-page">
        <NftDetail key={openNft} session={session} id={openNft} onClose={() => setOpenNft(null)} />
      </div>
    );
  }

  const typeLabel = (id) => getWearableTypes().find((t) => t.id === id)?.label ?? id;
  const charName = (id) => data.characters.find((c) => c.id === id)?.name ?? id;
  const items = tab === "wearables" ? data.wearables : data.characters;
  const nextSort = Math.max(0, ...items.map((i) => i.sortOrder ?? 0)) + 1;
  const view = views[tab] ?? emptyView;
  const shown = applyListView(items, view, {
    pack: (i) => getPack(i.pack).id,
    also: (i) => [i.id, i.title ?? ""],
  });
  const listPacks = packOptions(items, { pack: (i) => getPack(i.pack).id, label: (id) => getPack(id).name });

  return (
    <div className="container market-page admin-page">
      <PageHeader eyebrow="ADMIN" title="Catalogue admin" aside={<NetworkBadge />}>
        Signed in as <span className="mono">{address.slice(0, 4)}…{address.slice(-4)}</span>. Drafts are only
        visible here; publishing puts an item straight into the marketplace.
      </PageHeader>

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Catalogue">
          {[
            ["wearables", `Wearables (${data.wearables.length})`],
            ["characters", `Characters (${data.characters.length})`],
            ["nfts", "NFTs"],
            ["drops", "Drops"],
            ["home", "Home"],
            ["packs", "Packs"],
            ["animator", waiting ? `Animator (${waiting} to review)` : "Animator"],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {(tab === "wearables" || tab === "characters") && (
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              setEditing(
                tab === "wearables"
                  ? { kind: "wearable", item: newWearable(nextSort) }
                  : { kind: "character", item: newCharacter(nextSort) },
              )
            }>
            <Plus size={17} /> New {tab === "wearables" ? "wearable" : "character"}
          </button>
        )}
      </div>

      {tab === "nfts" ? (
        <NftRegistry session={session} onOpen={setOpenNft} />
      ) : tab === "drops" ? (
        <DropsAdmin session={session} characters={data.characters} onChange={content.reload} />
      ) : tab === "packs" ? (
        <PacksAdmin session={session} characters={data.characters} wearables={data.wearables} onChange={refresh} />
      ) : tab === "animator" ? (
        <StudioAdmin session={session} onCount={setWaiting} />
      ) : tab === "home" ? (
        <HomeAdmin session={session} characters={data.characters} onChange={content.reload} />
      ) : (
        <>
        <ListControls
          view={view}
          onChange={(v) => setViews((all) => ({ ...all, [tab]: v }))}
          packs={listPacks}
          placeholder={tab === "wearables" ? "Search wearables by name" : "Search characters by name"}
          sorts={[["order", "Catalogue order"]]}
          noun={`${shown.length} of ${items.length}`}
        />
        {!shown.length && (
          <p className="admin-hint list-empty">
            {items.length
              ? `No ${tab === "wearables" ? "wearables" : "characters"} match${view.query ? ` “${view.query}”` : ""}${view.pack !== ALL ? ` in ${getPack(view.pack).name}` : ""}.`
              : `No ${tab} yet.`}
          </p>
        )}
        <ul className="admin-list">
          {shown.map((item) => (
            <li key={item.id}>
              <span className={`admin-list-art character-stage stage-${item.edition ?? "companion"}`}>
                <ItemArt
                  art={item.art}
                  alt=""
                  itemId={item.id}
                  item={tab === "wearables" ? item : undefined}
                  size="sm"
                />
              </span>
              <span className="admin-list-main">
                <strong>{item.name}</strong>
                <span className="admin-hint">
                  {tab === "wearables"
                    ? `${getPack(item.pack).name} · ${typeLabel(item.type)}${item.groupId ? ` · ${item.groupName || item.groupId}: ${item.variantLabel ?? ""}` : ""} · fits ${item.compatibleCharacters.map(charName).join(", ") || "nobody"}`
                    : `${getPack(item.pack).name} · ${item.editionLabel || item.edition} · ${isDressable(item) ? "dressable" : "placeholder"}`}
                </span>
              </span>
              <span className="admin-list-meta">
                <span className={`admin-chip ${item.published ? "is-live" : ""}`}>{item.published ? "Published" : "Draft"}</span>
                <span className="admin-hint">
                  {item.listing.status} · {formatPrice(item.listing.price, item.listing.currency)}
                </span>
              </span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setEditing({ kind: tab === "wearables" ? "wearable" : "character", item })}>
                <Pencil size={15} /> Edit
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}

export default Admin;
