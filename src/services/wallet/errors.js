// Turns wallet-adapter errors into short, human messages.
// Matches on `error.name` so it works for errors from any adapter.

const MESSAGES = {
  WalletNotReadyError: {
    title: "Wallet not found",
    message: "Install the wallet extension, then refresh this page.",
  },
  WalletWindowClosedError: {
    title: "Connection cancelled",
    message: "The wallet window was closed before approving.",
  },
  WalletTimeoutError: {
    title: "Wallet didn’t respond",
    message: "Open your wallet and try again.",
  },
  WalletDisconnectedError: {
    title: "Wallet disconnected",
    message: "Your wallet disconnected. Connect again to continue.",
  },
};

function isRejection(error) {
  const text = `${error?.message ?? ""} ${error?.error?.message ?? ""}`.toLowerCase();
  return error?.error?.code === 4001 || /reject|denied|declin|cancel/.test(text);
}

export function describeWalletError(error) {
  if (isRejection(error)) {
    return { title: "Connection cancelled", message: "You declined the request in your wallet." };
  }

  return (
    MESSAGES[error?.name] ?? {
      title: "Couldn’t connect wallet",
      message: error?.message || "Something went wrong talking to your wallet. Please try again.",
    }
  );
}
