import { DEPLOYMENT } from "../../config/deployment";
import { getReadUmi } from "../solana/umi";

// Live listing state read straight from the candy machines.

// → { [itemId]: { supply, redeemed, remaining } }
export async function fetchLiveSupply() {
  const entries = Object.entries(DEPLOYMENT.items);
  if (!entries.length) return {};

  const umi = await getReadUmi();
  const { safeFetchAllCandyMachine } = await import("@metaplex-foundation/mpl-core-candy-machine");
  const { publicKey } = await import("@metaplex-foundation/umi");

  const machines = await safeFetchAllCandyMachine(
    umi,
    entries.map(([, d]) => publicKey(d.candyMachine)),
  );
  const byAddress = new Map(machines.map((m) => [m.publicKey.toString(), m]));

  return Object.fromEntries(
    entries
      .filter(([, d]) => byAddress.has(d.candyMachine))
      .map(([id, d]) => {
        const m = byAddress.get(d.candyMachine);
        const supply = Number(m.data.itemsAvailable);
        const redeemed = Number(m.itemsRedeemed);
        return [id, { supply, redeemed, remaining: supply - redeemed }];
      }),
  );
}

// How many times `owner` has minted each per-wallet-limited item.
// Read from the mintLimit guard's counter accounts, so it can't be gamed by
// transferring the NFT away. → { [itemId]: count }
export async function fetchMintCounts(owner) {
  const limited = Object.entries(DEPLOYMENT.items).filter(([, d]) => d.mintLimitId);
  if (!limited.length || !owner) return {};

  const umi = await getReadUmi();
  const { findMintCounterPda, safeFetchAllMintCounter } = await import(
    "@metaplex-foundation/mpl-core-candy-machine"
  );
  const { publicKey } = await import("@metaplex-foundation/umi");

  const pdas = limited.map(([, d]) =>
    findMintCounterPda(umi, {
      id: d.mintLimitId,
      user: publicKey(owner),
      candyGuard: publicKey(d.candyGuard),
      candyMachine: publicKey(d.candyMachine),
    })[0],
  );
  const counters = await safeFetchAllMintCounter(umi, pdas);
  const byAddress = new Map(counters.map((c) => [c.publicKey.toString(), c.count]));

  return Object.fromEntries(limited.map(([id], i) => [id, byAddress.get(pdas[i].toString()) ?? 0]));
}
