import { NETWORK } from "../../config/network";

// Metaplex Umi, loaded on demand so the Metaplex libraries stay out of the
// first page load. One read-only instance is shared; signing instances wrap
// the connected wallet adapter (the wallet signs — no keys ever touch the app).

let readOnly;

async function load() {
  const [{ createUmi }, { mplCore }, { mplCandyMachine }] = await Promise.all([
    import("@metaplex-foundation/umi-bundle-defaults"),
    import("@metaplex-foundation/mpl-core"),
    import("@metaplex-foundation/mpl-core-candy-machine"),
  ]);
  return createUmi(NETWORK.rpcUrl, { commitment: "confirmed" }).use(mplCore()).use(mplCandyMachine());
}

export function getReadUmi() {
  readOnly ??= load();
  return readOnly;
}

export async function getWalletUmi(walletAdapter) {
  const [umi, { walletAdapterIdentity }] = await Promise.all([
    load(),
    import("@metaplex-foundation/umi-signer-wallet-adapters"),
  ]);
  return umi.use(walletAdapterIdentity(walletAdapter));
}
