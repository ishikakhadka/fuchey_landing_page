// Retries a confirm call while the chain catches up with what we just sent.
export async function confirmWithRetry(call, attempts = 6) {
  for (let i = 0; ; i++) {
    try {
      return await call(i === attempts - 1);
    } catch (error) {
      if (error.status !== 409 || i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}
