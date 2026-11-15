// Today's SOL price in USD, for turning a USD catalogue price into the SOL
// amount an on-chain sale charges. Admin-only; public price, no API key.
export async function fetchSolUsd() {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
  if (!res.ok) throw new Error("Couldn’t load the SOL price. Try again, or type the SOL amount yourself.");
  const rate = Number((await res.json())?.solana?.usd);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("The SOL price came back empty. Type the SOL amount yourself.");
  return rate;
}

// USD → SOL, rounded up to 4 decimals so the sale never undercharges.
export const usdToSol = (usd, rate) => Math.ceil((usd / rate) * 10_000) / 10_000;
