import { useEffect, useState } from "react";
import { CalendarClock, Check, CircleAlert } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import { NETWORK } from "../../config/network";
import { useWallet } from "../../hooks/useWallet";
import { adminNft } from "../../services/backend/admin";
import { updateSale } from "../../services/nft/deploy";
import { confirmWithRetry } from "./onchain";

const sameTime = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(Date.parse(a) - Date.parse(b)) < 60_000);
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "no date");

// Each character's NFT and sale, lined up against the drop: a drop can only
// be scheduled once every character is minted, and one button opens every
// character's on-chain sale at the drop's start (and closes it at its end).
// Each sale change is a candy-guard update the admin's wallet approves.
function DropSales({ drop, characters, session, saved }) {
  const wallet = useWallet();
  const [rows, setRows] = useState({}); // id → nftStatus response
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const crew = drop.characterIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean);
  const mintedIds = crew.filter((c) => c.nft?.[NETWORK.id]?.status === "minted").map((c) => c.id);
  const allMinted = crew.length > 0 && mintedIds.length === crew.length;
  const crewKey = mintedIds.join(",");

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    const ids = crewKey ? crewKey.split(",") : [];
    Promise.all(
      ids.map((id) =>
        adminNft(session, "nftStatus", { kind: "character", id, network: NETWORK.id }).then(
          (r) => [id, r],
          () => [id, null],
        ),
      ),
    ).then((entries) => active && setRows(Object.fromEntries(entries)));
    return () => {
      active = false;
    };
  }, [session, crewKey, version]);

  const inStep = (id) => {
    const live = rows[id]?.live;
    return Boolean(live && rows[id]?.listing?.status === "active" && sameTime(live.startsAt, drop.startsAt) && sameTime(live.endsAt, drop.endsAt));
  };
  const pending = crew.filter((c) => !inStep(c.id));

  const schedule = async () => {
    setError(null);
    try {
      for (const c of pending) {
        setBusy(`${c.name}: preparing…`);
        const base = { kind: "character", id: c.id, network: NETWORK.id };
        const { plan } = await adminNft(session, "prepareSale", { ...base, state: "active", startsAt: drop.startsAt, endsAt: drop.endsAt });
        setBusy(`${c.name}: approve in your wallet…`);
        const result = await updateSale(wallet.signer, plan, () => {});
        setBusy(`${c.name}: verifying on-chain…`);
        await confirmWithRetry((final) => adminNft(session, "confirmSale", { ...base, ...result, signature: result.signatures.at(-1), final }));
      }
    } catch (e) {
      setError(e.message ?? "Scheduling failed.");
    } finally {
      setBusy(null);
      load();
    }
  };

  const blockers = [
    !crew.length && "Add characters to the capsule.",
    crew.length > 0 && !allMinted && "Mint every character first (Characters tab → open the character → NFT).",
    !drop.startsAt && "Set a start date.",
    !saved && "Save the drop first.",
    !wallet.connected && "Connect the wallet that minted the characters.",
  ].filter(Boolean);

  return (
    <div className="admin-field is-wide">
      <ul className="admin-sales">
        {crew.map((c) => {
          const minted = mintedIds.includes(c.id);
          const live = rows[c.id]?.live;
          const ok = minted && inStep(c.id);
          return (
            <li key={c.id} className={ok ? "is-ok" : ""}>
              <ItemArt art={c.art} alt="" itemId={c.id} size="sm" />
              <span className="admin-pick-name">
                <b>{c.name}</b>
                <small>
                  {!minted
                    ? `Not minted on ${NETWORK.label}`
                    : ok
                      ? `Sale opens with the drop · ${when(live.startsAt)}`
                      : live
                        ? `Minted · sale ${rows[c.id]?.listing?.status ?? "not listed"}${live.startsAt ? `, opens ${when(live.startsAt)}` : ""}`
                        : "Minted · checking the sale…"}
                </small>
              </span>
              {ok ? <Check size={18} className="admin-ok-icon" /> : <CircleAlert size={18} className="admin-warn-icon" />}
            </li>
          );
        })}
      </ul>
      {blockers.length > 0 ? (
        <ul className="admin-blockers">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : pending.length === 0 ? (
        <p className="admin-ok">Every character’s sale opens at the drop’s start{drop.endsAt ? " and closes at its end" : ""}.</p>
      ) : (
        <button type="button" className="primary-button" onClick={schedule} disabled={Boolean(busy)}>
          <CalendarClock size={16} /> {busy ?? `Open ${pending.length} character sale${pending.length === 1 ? "" : "s"} with the drop`}
        </button>
      )}
      {error && <p className="admin-error">{error}</p>}
      <p className="admin-hint">
        Each sale is set on-chain to open at {when(drop.startsAt)}
        {drop.endsAt ? ` and close at ${when(drop.endsAt)}` : ""}, at the price on its listing. Change the drop’s dates and run this again to move them.
      </p>
    </div>
  );
}

export default DropSales;
