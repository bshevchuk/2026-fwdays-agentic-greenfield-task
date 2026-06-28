// @trace FR-FX-03
// Session-scoped in-memory rate cache.
// The module-level Map persists for the lifetime of the server process.
// On Vercel, each function invocation may be a fresh process (cold cache) — intentional.

const _cache = new Map<string, number>();

export const getCachedRate = (currency: string): number | undefined =>
  _cache.get(currency);

export const setCachedRate = (currency: string, rate: number): void => {
  _cache.set(currency, rate);
};
