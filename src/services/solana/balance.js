import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function getSolBalance(connection, publicKey) {
  const lamports = await connection.getBalance(publicKey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}
