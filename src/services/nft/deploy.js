// Builds and sends the admin's on-chain transactions from a plan the backend
// issued (functions/admin/nft.ts). The connected wallet signs — whichever
// Solana wallet app it is — and the backend then verifies the result on-chain
// before recording anything. No keys are involved anywhere but the wallet.
//
// Edition model: mint on purchase. Deploying a product creates
//   1. a Metaplex Core collection (update authority: the admin wallet)
//   2. a Core Candy Machine for it (itemsAvailable = edition size; hidden
//      settings: every copy shares the metadata URI, named "<Name> #n")
//   3. a Candy Guard wrapping it: price (solPayment), per-wallet limit
//      (mintLimit) and the sale window (startDate / endDate)
// The guard starts closed; opening / pausing / ending a sale updates it.

// A start date this far out keeps the sale closed until a listing opens it.
const CLOSED = "2100-01-01T00:00:00Z";

async function libs() {
  const [umi, core, cm, ser] = await Promise.all([
    import("@metaplex-foundation/umi"),
    import("@metaplex-foundation/mpl-core"),
    import("@metaplex-foundation/mpl-core-candy-machine"),
    import("@metaplex-foundation/umi/serializers"),
  ]);
  return { umi, core, cm, ser };
}

// Sale terms → candy guard settings.
function guards({ umi }, { price, treasury, limitPerWallet, state, startsAt, endsAt }) {
  const { dateTime, none, publicKey, sol, some } = umi;
  const now = new Date();
  const start = state === "active" ? (startsAt ? new Date(startsAt) : now) : null;
  const end = state === "ended" ? now : state === "active" && endsAt ? new Date(endsAt) : null;
  return {
    solPayment: price > 0 ? some({ lamports: sol(price), destination: publicKey(treasury) }) : none(),
    mintLimit: limitPerWallet ? some({ id: 1, limit: limitPerWallet }) : none(),
    startDate: some({ date: dateTime(start ? start.toISOString() : CLOSED) }),
    endDate: end ? some({ date: dateTime(end.toISOString()) }) : none(),
  };
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// Signs every transaction with one wallet approval, then sends them in order,
// each confirmed before the next. → base58 signatures.
async function signAndSend(umi, { umi: u, ser }, builders, onStage) {
  const blockhash = await umi.rpc.getLatestBlockhash({ commitment: "confirmed" });
  const parts = builders.flatMap((b) => b.unsafeSplitByTransactionSize(umi)).map((b) => b.setBlockhash(blockhash));
  const built = await Promise.all(parts.map((p) => p.build(umi)));
  onStage?.("signing");
  const signed = await u.signAllTransactions(parts.map((p, i) => ({ transaction: built[i], signers: p.getSigners(umi) })));
  onStage?.("sending");
  const signatures = [];
  for (const tx of signed) {
    const signature = await umi.rpc.sendTransaction(tx, { commitment: "confirmed" });
    const result = await umi.rpc.confirmTransaction(signature, {
      commitment: "confirmed",
      strategy: { type: "blockhash", ...blockhash },
    });
    const sig = ser.base58.deserialize(signature)[0];
    if (result.value.err) throw Object.assign(new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`), { signature: sig });
    signatures.push(sig);
  }
  return signatures;
}

// Umi for the connected wallet (loaded lazily, with the rest of the SDKs).
async function walletUmi(signer) {
  const { getWalletUmi } = await import("../solana/umi");
  return getWalletUmi(signer);
}

// plan: { authority, title, copyName, metadataUrl, supply, price, treasury, limitPerWallet }
// → { collection, candyMachine, signatures }
export async function deployProduct(signer, plan, onStage) {
  if (signer?.publicKey?.toBase58() !== plan.authority) {
    throw new Error("Connect the admin wallet that requested this mint.");
  }
  return deployWithUmi(await walletUmi(signer), plan, onStage);
}

// Same, with any Umi whose identity is the plan's authority (used by tests).
export async function deployWithUmi(umi, plan, onStage) {
  const l = await libs();
  const collection = l.umi.generateSigner(umi);
  const candyMachine = l.umi.generateSigner(umi);

  const collectionTx = l.core.createCollection(umi, {
    collection,
    name: plan.title,
    uri: plan.metadataUrl,
    updateAuthority: umi.identity.publicKey,
  });
  const machineTx = await l.cm.create(umi, {
    candyMachine,
    collection: collection.publicKey,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: plan.supply,
    isMutable: true,
    configLineSettings: l.umi.none(),
    hiddenSettings: l.umi.some({
      // $ID+1$ is replaced on-chain with the copy number.
      name: `${plan.copyName} #$ID+1$`,
      uri: plan.metadataUrl,
      hash: await sha256(plan.metadataUrl),
    }),
    guards: guards(l, { ...plan, state: "draft" }),
  });

  const signatures = await signAndSend(umi, l, [collectionTx, machineTx], onStage);
  return { collection: collection.publicKey.toString(), candyMachine: candyMachine.publicKey.toString(), signatures };
}

// New artwork for a deployed product. Points the collection, the candy
// machine (every future copy) and each live copy at the new metadata URI.
// Copy names and supply stay as deployed. One wallet approval for all of it.
// plan: { authority, collection, candyMachine, metadataUrl, hiddenName, supply, assets } → { signatures }
export async function updateMetadata(signer, plan, onStage) {
  if (signer?.publicKey?.toBase58() !== plan.authority) {
    throw new Error("Connect the admin wallet that deployed this item.");
  }
  return updateMetadataWithUmi(await walletUmi(signer), plan, onStage);
}

export async function updateMetadataWithUmi(umi, plan, onStage) {
  const l = await libs();
  const { none, publicKey, some, transactionBuilder } = l.umi;
  const collection = publicKey(plan.collection);

  let builder = transactionBuilder()
    .add(l.core.updateCollectionV1(umi, { collection, newName: none(), newUri: some(plan.metadataUrl) }))
    .add(
      l.cm.updateCandyMachine(umi, {
        candyMachine: publicKey(plan.candyMachine),
        data: {
          itemsAvailable: plan.supply,
          maxEditionSupply: 0,
          isMutable: true,
          configLineSettings: none(),
          hiddenSettings: some({ name: plan.hiddenName, uri: plan.metadataUrl, hash: await sha256(plan.metadataUrl) }),
        },
      }),
    );
  for (const asset of plan.assets) {
    builder = builder.add(
      l.core.updateV1(umi, { asset: publicKey(asset), collection, newName: none(), newUri: some(plan.metadataUrl), newUpdateAuthority: none() }),
    );
  }
  return { signatures: await signAndSend(umi, l, [builder], onStage) };
}

// plan: { candyGuard, price, treasury, limitPerWallet, state, startsAt?, endsAt? } → { signatures }
export async function updateSale(signer, plan, onStage) {
  return updateSaleWithUmi(await walletUmi(signer), plan, onStage);
}

export async function updateSaleWithUmi(umi, plan, onStage) {
  const l = await libs();
  const builder = l.cm.updateCandyGuard(umi, {
    candyGuard: l.umi.publicKey(plan.candyGuard),
    guards: guards(l, plan),
    groups: [],
  });
  return { signatures: await signAndSend(umi, l, [builder], onStage) };
}
