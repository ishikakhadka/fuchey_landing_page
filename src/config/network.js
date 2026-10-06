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

// `network` defaults to the site's; pass a record's own network (e.g. an NFT
// minted on devnet) so links never point at the wrong cluster.
const explorerSuffix = (network) => (network ? (CLUSTERS[network]?.explorerSuffix ?? "") : NETWORK.explorerSuffix);

export function explorerAddressUrl(address, network) {
  return `https://explorer.solana.com/address/${address}${explorerSuffix(network)}`;
}

export function explorerTxUrl(signature, network) {
  return `https://explorer.solana.com/tx/${signature}${explorerSuffix(network)}`;
}

export const networkLabel = (network) => CLUSTERS[network]?.label ?? network;
