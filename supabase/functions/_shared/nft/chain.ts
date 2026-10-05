// Solana reads for the backend: verifying deployments, listings, purchases and
// ownership straight from the chain.
//
// The server never signs and never builds transactions: the admin's wallet
// builds and signs them in the browser (src/services/nft/deploy.js), and the
// buyer's wallet signs purchases. The backend's job is to decide *what* may be
// deployed (plan) and then to check *what actually happened* on-chain before
// saving anything. Everything here is raw JSON-RPC + the small decoders in
// accounts.ts — the Metaplex SDKs are too heavy for an edge function.
//
// Edition model: mint on purchase. A product = one Metaplex Core collection +
// one Core Candy Machine (itemsAvailable = edition size; hidden settings → all
// copies share the metadata URI, named "<Name> #n"), wrapped by a Candy Guard
// that enforces price (solPayment), per-wallet limit (mintLimit) and the sale
// window (startDate / endDate).

import { HttpError } from "../http.ts";
import { hasDas, rpcUrl, type Network } from "./config.ts";
import { CORE_PROGRAM, decodeAsset, decodeCandyGuard, decodeCandyMachine, decodeCollection } from "./accounts.ts";

export const CANDY_MACHINE_PROGRAM = "CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J";
export const CANDY_GUARD_PROGRAM = "CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ";

// Sales are "closed" by a start date far in the future (see deploy.js).
export const CLOSED_AT = Date.parse("2100-01-01T00:00:00Z") / 1000;
const LAMPORTS = 1_000_000_000;

export type SaleState = "draft" | "active" | "paused" | "ended";

async function rpc(network: Network, method: string, params: unknown) {
  const response = await fetch(rpcUrl(network), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json().catch(() => ({}));
  if (body.error) throw new HttpError(502, `Solana RPC: ${body.error.message ?? "error"}`);
  return body.result;
}

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function account(network: Network, address: string) {
  const r = await rpc(network, "getAccountInfo", [address, { encoding: "base64", commitment: "confirmed" }]);
  return r?.value ? { owner: r.value.owner as string, data: b64(r.value.data[0]) } : null;
}

// --- deployments ---------------------------------------------------------------

// Checks a deployment matches the plan the backend issued.
export async function verifyDeploy(network: Network, expect: {
  admin: string;
  collection: string;
  candyMachine: string;
  title: string;
  metadataUrl: string;
  supply: number;
}) {
  const problems: string[] = [];
  const [colAcc, cmAcc] = await Promise.all([account(network, expect.collection), account(network, expect.candyMachine)]);

  const col = colAcc?.owner === CORE_PROGRAM ? decodeCollection(colAcc.data) : null;
  if (!col) problems.push("collection account not found");
  else {
    if (col.updateAuthority !== expect.admin) problems.push("collection has a different update authority");
    if (col.uri !== expect.metadataUrl) problems.push("collection metadata URI differs");
    if (col.name !== expect.title) problems.push("collection name differs");
  }

  const cm = cmAcc?.owner === CANDY_MACHINE_PROGRAM ? decodeCandyMachine(cmAcc.data) : null;
  let candyGuard: string | null = null;
  if (!cm) problems.push("candy machine account not found");
  else {
    if (cm.authority !== expect.admin) problems.push("candy machine has a different authority");
    if (cm.collectionMint !== expect.collection) problems.push("candy machine points at another collection");
    if (cm.itemsAvailable !== expect.supply) problems.push("candy machine supply differs");
    if (cm.hidden?.uri !== expect.metadataUrl || cm.configLines) problems.push("candy machine metadata differs");
    // Wrapped: its mint authority is a candy guard whose base is this machine.
    const gAcc = await account(network, cm.mintAuthority);
    const guard = gAcc?.owner === CANDY_GUARD_PROGRAM ? decodeCandyGuard(gAcc.data) : null;
    if (!guard || guard.base !== expect.candyMachine) problems.push("candy machine isn’t wrapped by its candy guard");
    else {
      candyGuard = cm.mintAuthority;
      if (guard.authority !== expect.admin) problems.push("candy guard has a different authority");
    }
  }
  return { ok: problems.length === 0, problems, candyGuard };
}

// --- sales ---------------------------------------------------------------------

// What the guard enforces right now, plus live supply.
export async function readSale(network: Network, candyGuard: string, candyMachine: string) {
  const [gAcc, cmAcc] = await Promise.all([account(network, candyGuard), account(network, candyMachine)]);
  if (gAcc?.owner !== CANDY_GUARD_PROGRAM || cmAcc?.owner !== CANDY_MACHINE_PROGRAM) return null;
  const { authority, guards: g, groups } = decodeCandyGuard(gAcc.data);
  const cm = decodeCandyMachine(cmAcc.data);
  const now = Date.now() / 1000;
  const start = g.startDate != null ? Number(g.startDate) : null;
  const end = g.endDate != null ? Number(g.endDate) : null;
  return {
    authority,
    guards: g.enabled,
    groups,
    price: g.solPayment ? Number(g.solPayment.lamports) / LAMPORTS : 0,
    treasury: g.solPayment?.destination ?? null,
    limitPerWallet: g.mintLimit?.limit ?? null,
    startsAt: start != null && start < CLOSED_AT ? new Date(start * 1000).toISOString() : null,
    endsAt: end != null ? new Date(end * 1000).toISOString() : null,
    open: start != null && start < CLOSED_AT && start <= now && (end == null || end > now),
    supply: cm.itemsAvailable,
    minted: cm.itemsRedeemed,
    remaining: cm.itemsAvailable - cm.itemsRedeemed,
  };
}

// --- purchases / ownership ---------------------------------------------------

// A confirmed, successful transaction that the wallet signed and that touched
// the asset account.
export async function checkPurchaseTx(network: Network, signature: string, wallet: string, asset: string) {
  const tx = await rpc(network, "getTransaction", [
    signature,
    { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 0 },
  ]);
  if (!tx) return { ok: false, reason: "transaction not found or not confirmed yet" };
  if (tx.meta?.err) return { ok: false, reason: "transaction failed on-chain" };
  const msg = tx.transaction.message;
  const keys: string[] = [...msg.accountKeys, ...(tx.meta?.loadedAddresses?.writable ?? []), ...(tx.meta?.loadedAddresses?.readonly ?? [])];
  const signers = msg.accountKeys.slice(0, msg.header.numRequiredSignatures);
  if (!signers.includes(wallet)) return { ok: false, reason: "wallet didn't sign this transaction" };
  if (!keys.includes(asset)) return { ok: false, reason: "transaction doesn't involve that asset" };
  return { ok: true, slot: tx.slot as number };
}

// One Core asset → owner + collection (null if it isn't a Core asset).
export async function readAsset(network: Network, address: string) {
  const acc = await account(network, address);
  return acc?.owner === CORE_PROGRAM ? decodeAsset(acc.data) : null;
}

// Every Core asset a wallet holds → [{ address, collection }]. Helius DAS when
// configured (indexed, works on mainnet), else a Core program scan filtered by
// owner (fine on devnet; public mainnet RPC refuses it).
export async function assetsOwnedBy(network: Network, owner: string): Promise<{ address: string; collection: string | null }[]> {
  if (hasDas()) {
    const out: { address: string; collection: string | null }[] = [];
    for (let page = 1; page < 50; page++) {
      const r = await rpc(network, "getAssetsByOwner", { ownerAddress: owner, page, limit: 1000 });
      for (const item of r?.items ?? []) {
        const group = (item.grouping ?? []).find((g: { group_key: string }) => g.group_key === "collection");
        out.push({ address: item.id, collection: group?.group_value ?? null });
      }
      if (!r?.items || r.items.length < 1000) break;
    }
    return out;
  }
  const accounts = await rpc(network, "getProgramAccounts", [
    CORE_PROGRAM,
    {
      encoding: "base64",
      commitment: "confirmed",
      filters: [
        { memcmp: { offset: 0, bytes: "2" } }, // key = AssetV1 (1)
        { memcmp: { offset: 1, bytes: owner } },
      ],
    },
  ]);
  return (accounts ?? []).flatMap((a: { pubkey: string; account: { data: [string, string] } }) => {
    const asset = decodeAsset(b64(a.account.data[0]));
    return asset ? [{ address: a.pubkey, collection: asset.collection }] : [];
  });
}
