// Single source of truth for which Solana cluster the marketplace talks to.
// Switch with VITE_SOLANA_NETWORK=mainnet-beta (and optionally a custom RPC
// via VITE_SOLANA_RPC_URL). Nothing else in the app should hardcode an RPC URL.
//
// Only public values belong here — never put keys or secrets in VITE_* vars,
// they are bundled into the browser build.

const CLUSTERS = {
  devnet: {
    id: "devnet",
    label: "Devnet",
    rpcUrl: "https://api.devnet.solana.com",
    explorerSuffix: "?cluster=devnet",
    faucetUrl: "https://faucet.solana.com",
  },
  "mainnet-beta": {
    id: "mainnet-beta",
    label: "Mainnet",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerSuffix: "",
    faucetUrl: null,
  },
};

const requested = import.meta.env.VITE_SOLANA_NETWORK ?? "devnet";
const cluster = CLUSTERS[requested] ?? CLUSTERS.devnet;

export const NETWORK = {
  ...cluster,
  rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || cluster.rpcUrl,
  isMainnet: cluster.id === "mainnet-beta",
};

export function explorerAddressUrl(address) {
  return `https://explorer.solana.com/address/${address}${NETWORK.explorerSuffix}`;
}

export function explorerTxUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}${NETWORK.explorerSuffix}`;
}
