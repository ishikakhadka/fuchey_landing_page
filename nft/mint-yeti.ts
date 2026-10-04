import fs from "fs";
import {
  createUmi,
  generateSigner,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import { mplCore, create } from "@metaplex-foundation/mpl-core";

const umi = createUmi("https://api.devnet.solana.com").use(mplCore());

const secretKey = new Uint8Array(
  JSON.parse(
    fs.readFileSync("/home/lenovo/.config/solana/fuchey-devnet.json", "utf-8"),
  ),
);

const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);

umi.use(keypairIdentity(keypair));

console.log("Wallet connected:", umi.identity.publicKey);

const asset = generateSigner(umi);

console.log("Creating Yeti NFT...");

await create(umi, {
  asset,
  name: "Fuchey Yeti",
  uri: "ipfs://bafkreianvobi3sgrmxzqb3kfp5fc7hlcyv4z3lo47rtnqg7n2g3xjgwsua",
}).sendAndConfirm(umi);

console.log("Yeti NFT minted!");
console.log("Asset address:", asset.publicKey);
