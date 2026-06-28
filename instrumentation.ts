// @trace FR-SHELL-01
// Called once per Next.js server instance startup — runs migrations before the
// first request is handled. Guard against Edge runtime (no better-sqlite3 there).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getDb } = await import('./lib/db/client');
    getDb(); // opens the DB, sets WAL + FK pragmas, and runs all pending migrations
  }
}
