import { deploymentOf } from "../../config/deployment";
import { getSolBalance } from "../solana/balance";
import { getWalletUmi } from "../solana/umi";
import { fetchLiveSupply, fetchMintCounts } from "./listings";
import { PurchaseError } from "./errors";

// Network fee + rent for the new asset account, with headroom.
const FEE_BUFFER_SOL = 0.01;

// Buys / claims one item through its Core Candy Machine.
//
// The guards on-chain enforce price, supply and per-wallet limits; the checks
// here only exist to give a clear message before asking the wallet to sign.
// Nothing is reported as purchased until Solana confirms the transaction.
//
// onStage(stage, details) is called with:
//   "preparing" → "signing" → "submitted" { signature } → "confirmed" { signature, asset }
//
// The price shown and checked here is the catalogue's; the amount actually
// charged is whatever the candy guard on-chain says.
export async function purchaseItem({ item, wallet, connection, onStage = () => {} }) {
  const deployment = deploymentOf(item);
  if (!deployment) throw new PurchaseError("not-deployed", "This item isn’t on sale on this network yet.");
  if (!wallet?.publicKey) throw new PurchaseError("wallet-disconnected");

  onStage("preparing");

  const owner = wallet.publicKey.toBase58();
  const [supply, counts, balance] = await Promise.all([
    fetchLiveSupply({ [item.id]: deployment }),
    deployment.mintLimitId ? fetchMintCounts(owner, { [item.id]: deployment }) : {},
    getSolBalance(connection, wallet.publicKey),
  ]);

  if (supply[item.id]?.remaining === 0) throw new PurchaseError("sold-out");
  if (item.listing.limitPerWallet && (counts[item.id] ?? 0) >= item.listing.limitPerWallet) {
    throw new PurchaseError("limit-reached");
  }
  const price = item.listing.price ?? 0;
  if (balance < price + FEE_BUFFER_SOL) throw new PurchaseError("insufficient-sol");

  const umi = await getWalletUmi(wallet);
  const [{ generateSigner, publicKey, some, transactionBuilder }, { mintV1 }, { setComputeUnitLimit }, { base58 }] =
    await Promise.all([
      import("@metaplex-foundation/umi"),
      import("@metaplex-foundation/mpl-core-candy-machine"),
      import("@metaplex-foundation/mpl-toolbox"),
      import("@metaplex-foundation/umi/serializers"),
    ]);

  // A fresh keypair for the new asset account. It only signs the account's
  // creation and is discarded; the NFT is owned by the user's wallet.
  const asset = generateSigner(umi);

  const mintArgs = {};
  if (price > 0) {
    if (!deployment.treasury) throw new PurchaseError("not-deployed", "This item’s payment address isn’t set up yet.");
    mintArgs.solPayment = some({ destination: publicKey(deployment.treasury) });
  }
  if (deployment.mintLimitId) mintArgs.mintLimit = some({ id: deployment.mintLimitId });

  const latest = await umi.rpc.getLatestBlockhash({ commitment: "confirmed" });
  const builder = transactionBuilder()
    .add(setComputeUnitLimit(umi, { units: 400_000 }))
    .add(
      mintV1(umi, {
        candyMachine: publicKey(deployment.candyMachine),
        collection: publicKey(deployment.collection),
        asset,
        mintArgs,
      }),
    )
    .setBlockhash(latest);

  onStage("signing");
  const signed = await builder.buildAndSign(umi);

  const raw = await umi.rpc.sendTransaction(signed, { commitment: "confirmed" });
  const signature = base58.deserialize(raw)[0];
  onStage("submitted", { signature });

  const result = await umi.rpc.confirmTransaction(raw, {
    commitment: "confirmed",
    strategy: { type: "blockhash", ...latest },
  });
  if (result.value.err) {
    throw Object.assign(new Error(JSON.stringify(result.value.err)), { signature });
  }

  const details = { signature, asset: asset.publicKey.toString() };
  onStage("confirmed", details);
  return details;
}
