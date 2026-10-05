// Classifies anything thrown during a purchase into a short, human message.
// Matches on error names, messages and program logs so it works across the
// wallet adapter, Umi and the candy guard program.

export class PurchaseError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "PurchaseError";
    this.code = code;
  }
}

const RULES = [
  {
    code: "rejected",
    test: /reject|denied|declin|cancel|WalletSignTransactionError|4001/i,
    title: "Transaction cancelled",
    message: "You declined the transaction in your wallet. Nothing was charged.",
  },
  {
    code: "insufficient-sol",
    test: /NotEnoughSOL|insufficient (funds|lamports)|no record of a prior credit|0x1\b/i,
    title: "Not enough SOL",
    message: "Your wallet doesn’t have enough SOL to cover the price and network fee.",
  },
  {
    code: "limit-reached",
    test: /AllowedMintLimitReached|mint limit/i,
    title: "Already claimed",
    message: "This wallet has already claimed the maximum for this item.",
  },
  {
    code: "sold-out",
    test: /CandyMachineEmpty|sold out/i,
    title: "Sold out",
    message: "Someone grabbed the last one. This item is sold out.",
  },
  {
    code: "wallet-disconnected",
    test: /WalletNotConnected|WalletDisconnected|not connected/i,
    title: "Wallet disconnected",
    message: "Your wallet disconnected. Reconnect it and try again.",
  },
  {
    code: "expired",
    test: /block height exceeded|blockhash not found|expired/i,
    title: "Transaction expired",
    message: "The network didn’t confirm it in time. Nothing was charged — please try again.",
  },
  {
    code: "network",
    test: /failed to fetch|network|timeout|ECONN|429|503/i,
    title: "Network problem",
    message: "Couldn’t reach Solana. Check your connection and try again.",
  },
];

function haystack(error) {
  return [
    error?.code,
    error?.name,
    error?.message,
    error?.cause?.message,
    error?.error?.message,
    ...(error?.logs ?? []),
    ...(error?.transactionLogs ?? []),
  ]
    .filter(Boolean)
    .join(" \n");
}

export function describePurchaseError(error) {
  // Confirmed on-chain, but our backend couldn't verify it (yet). The NFT is
  // probably in the wallet; we just won't claim success without the check.
  if (error?.code === "unverified") {
    return {
      code: "unverified",
      title: "Confirmed — verification pending",
      message:
        "Solana confirmed the transaction, but we couldn’t verify the new NFT yet. Check your wallet or refresh your collection in a minute.",
    };
  }
  if (error instanceof PurchaseError) {
    const rule = RULES.find((r) => r.code === error.code);
    if (rule) return { code: rule.code, title: rule.title, message: rule.message };
    return { code: error.code, title: "Can’t complete purchase", message: error.message };
  }

  const text = haystack(error);
  const rule = RULES.find((r) => r.test.test(text));
  if (rule) return { code: rule.code, title: rule.title, message: rule.message };

  return {
    code: "failed",
    title: "Transaction failed",
    message: "The transaction didn’t go through. Nothing was charged unless your wallet shows otherwise.",
  };
}
