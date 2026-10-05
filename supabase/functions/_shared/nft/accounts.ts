// Minimal, dependency-free decoders for the on-chain accounts the backend has
// to verify: Metaplex Core assets and collections, and Core Candy Machine /
// Candy Guard accounts.
//
// Why not the Metaplex SDKs? Loading them costs 2–5 s of CPU, more than an
// edge function's whole budget. These decoders read only the fields we check,
// with layouts taken from the SDK serializers (mpl-core 1.10, mpl-core-candy-
// machine 0.3) and are tested byte-for-byte against them (supabase/tests/devnet.test.mjs).

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58(bytes: Uint8Array) {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

// (Plain class fields, so Node can also run this file with type stripping.)
class Reader {
  bytes: Uint8Array;
  offset: number;
  view: DataView;
  constructor(bytes: Uint8Array, offset = 0) {
    this.bytes = bytes;
    this.offset = offset;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  u8() {
    return this.bytes[this.offset++];
  }
  u16() {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }
  u64() {
    const v = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return v;
  }
  i64() {
    const v = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return v;
  }
  bool() {
    return this.u8() !== 0;
  }
  key() {
    const k = base58(this.bytes.slice(this.offset, this.offset + 32));
    this.offset += 32;
    return k;
  }
  skip(n: number) {
    this.offset += n;
  }
  string() {
    const len = this.u32();
    const s = new TextDecoder().decode(this.bytes.slice(this.offset, this.offset + len));
    this.offset += len;
    return s;
  }
  option<T>(read: () => T): T | null {
    return this.bool() ? read() : null;
  }
}

// --- Metaplex Core -----------------------------------------------------------

export const CORE_PROGRAM = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

// AssetV1: key u8 (=1), owner, updateAuthority enum { None | Address(pk) |
// Collection(pk) }, name, uri, …
export function decodeAsset(data: Uint8Array) {
  const r = new Reader(data);
  if (r.u8() !== 1) return null;
  const owner = r.key();
  const uaKind = r.u8();
  const uaAddress = uaKind === 0 ? null : r.key();
  return {
    owner,
    collection: uaKind === 2 ? uaAddress : null,
    name: r.string(),
    uri: r.string(),
  };
}

// CollectionV1: key u8 (=5), updateAuthority, name, uri, numMinted u32, currentSize u32
export function decodeCollection(data: Uint8Array) {
  const r = new Reader(data);
  if (r.u8() !== 5) return null;
  return { updateAuthority: r.key(), name: r.string(), uri: r.string(), numMinted: r.u32(), currentSize: r.u32() };
}

// --- Core Candy Machine ----------------------------------------------------------

// discriminator[8], authority, mintAuthority, collectionMint, itemsRedeemed u64,
// data { itemsAvailable u64, maxEditionSupply u64, isMutable bool,
//        configLineSettings Option<{ prefixName str, nameLength u32, prefixUri str, uriLength u32, isSequential bool }>,
//        hiddenSettings Option<{ name str, uri str, hash [32] }> }
export function decodeCandyMachine(data: Uint8Array) {
  const r = new Reader(data);
  r.skip(8);
  const authority = r.key();
  const mintAuthority = r.key();
  const collectionMint = r.key();
  const itemsRedeemed = Number(r.u64());
  const itemsAvailable = Number(r.u64());
  r.u64(); // maxEditionSupply
  const isMutable = r.bool();
  const configLines = r.option(() => {
    r.string();
    r.u32();
    r.string();
    r.u32();
    r.bool();
    return true;
  });
  const hidden = r.option(() => {
    const name = r.string();
    const uri = r.string();
    r.skip(32);
    return { name, uri };
  });
  return { authority, mintAuthority, collectionMint, itemsRedeemed, itemsAvailable, isMutable, configLines: Boolean(configLines), hidden };
}

// --- Core Candy Guard ---------------------------------------------------------

// Guard order and sizes, from the SDK's defaultCandyGuardNames / serializers.
// We decode only guard sets made of the first ten (the ones Fuchey uses come
// from this range); anything else is reported as unsupported.
const GUARDS: [name: string, size: number][] = [
  ["botTax", 9], // lamports u64, lastInstruction bool
  ["solPayment", 40], // lamports u64, destination
  ["tokenPayment", 72],
  ["startDate", 8], // i64 unix seconds
  ["thirdPartySigner", 32],
  ["tokenGate", 40],
  ["gatekeeper", 33],
  ["endDate", 8],
  ["allowList", 32],
  ["mintLimit", 3], // id u8, limit u16
];

export type GuardSet = {
  enabled: string[];
  solPayment: { lamports: bigint; destination: string } | null;
  startDate: bigint | null;
  endDate: bigint | null;
  mintLimit: { id: number; limit: number } | null;
};

// discriminator[8], base, bump u8, authority, then guard set: features u64
// (bit i set = guard i present, little-endian), then each present guard in
// order; then groups (u32 count + …).
export function decodeCandyGuard(data: Uint8Array) {
  const r = new Reader(data);
  r.skip(8);
  const base = r.key();
  r.u8(); // bump
  const authority = r.key();
  const features = r.u64();
  const set: GuardSet = { enabled: [], solPayment: null, startDate: null, endDate: null, mintLimit: null };
  for (let i = 0; i < 64; i++) {
    if (!((features >> BigInt(i)) & 1n)) continue;
    const guard = GUARDS[i];
    if (!guard) throw new Error(`unsupported guard #${i} on candy guard`);
    const [name, size] = guard;
    set.enabled.push(name);
    const start = r.offset;
    if (name === "solPayment") set.solPayment = { lamports: r.u64(), destination: r.key() };
    else if (name === "startDate") set.startDate = r.i64();
    else if (name === "endDate") set.endDate = r.i64();
    else if (name === "mintLimit") set.mintLimit = { id: r.u8(), limit: r.u16() };
    r.offset = start + size;
  }
  const groups = r.u32();
  return { base, authority, guards: set, groups };
}
