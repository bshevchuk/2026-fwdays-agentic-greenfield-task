// @trace FR-FX-01, FR-FX-02
import 'server-only';
import { FxFetchError } from './errors';

/**
 * Fetch the USD rate for the given currency from the FX API.
 * Returns "how many USD is 1 unit of `currency` worth".
 */
export async function fetchRateToUsd(currency: string): Promise<number> {
  const base =
    process.env.FX_API_BASE_URL ?? 'https://api.frankfurter.app';
  const res = await fetch(
    `${base}/latest?base=${currency}&symbols=USD`,
  );
  if (!res.ok) {
    throw new FxFetchError(
      `Rate fetch failed for ${currency}: HTTP ${res.status}`,
    );
  }
  const data = (await res.json()) as { rates?: { USD?: number } };
  const rate = data.rates?.USD;
  if (!rate) {
    throw new FxFetchError(`No USD rate returned for ${currency}`);
  }
  return rate;
}
