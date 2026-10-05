// Chain / NFT configuration for the edge functions. Everything comes from
// environment variables (Supabase secrets); nothing here is a secret that
// reaches the browser.
//
//   FUCHEY_NETWORKS          networks admins may deploy to (default "devnet";
//                            add "mainnet-beta" explicitly when ready)
//   HELIUS_API_KEY           RPC + DAS for ownership reads (optional on devnet)
//   SOLANA_RPC_DEVNET / SOLANA_RPC_MAINNET   override RPC URLs
//   FUCHEY_TREASURY_DEVNET / FUCHEY_TREASURY_MAINNET
//                            where sale payments go (default: the deploying admin
//                            wallet on devnet; required on mainnet)
//   PINATA_JWT, PINATA_GATEWAY   IPFS storage (see storage.ts)

export const CHAIN = "solana";
export const STANDARD = "mpl-core";
export const SYMBOL = "FUCHEY";

export type Network = "devnet" | "mainnet-beta";
export type AssetKind = "character" | "wearable";

// Logical collections an asset belongs to. On-chain each product gets its own
// Metaplex Core collection (that's what its candy machine mints into and what
// identifies a copy as "a Fuchey Yeti"); these groups name and organise them.
export const COLLECTION_GROUPS: Record<AssetKind, { id: string; name: string }> = {
  character: { id: "fuchey-characters", name: "Fuchey Characters" },
  wearable: { id: "fuchey-wearables", name: "Fuchey Wearables" },
};

export function allowedNetworks(): Network[] {
  return (Deno.env.get("FUCHEY_NETWORKS") ?? "devnet")
    .split(",")
    .map((s) => s.trim())
    .filter((n): n is Network => n === "devnet" || n === "mainnet-beta");
}

export function rpcUrl(network: Network) {
  const override = Deno.env.get(network === "devnet" ? "SOLANA_RPC_DEVNET" : "SOLANA_RPC_MAINNET");
  if (override) return override;
  const helius = Deno.env.get("HELIUS_API_KEY");
  if (helius) return `https://${network === "devnet" ? "devnet" : "mainnet"}.helius-rpc.com/?api-key=${helius}`;
  return network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com";
}

export const hasDas = () => Boolean(Deno.env.get("HELIUS_API_KEY"));

export function configuredTreasury(network: Network) {
  return Deno.env.get(network === "devnet" ? "FUCHEY_TREASURY_DEVNET" : "FUCHEY_TREASURY_MAINNET") ?? null;
}

export function explorerTx(signature: string, network: Network) {
  return `https://explorer.solana.com/tx/${signature}${network === "devnet" ? "?cluster=devnet" : ""}`;
}
