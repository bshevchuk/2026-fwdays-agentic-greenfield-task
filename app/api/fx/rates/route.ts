// @trace FR-FX-01, FR-FX-02, FR-FX-03
// GET /api/fx/rates?currency=XXX
// Server-only Route Handler — never bundled into the client (TC-FX-01).

import { NextRequest, NextResponse } from 'next/server';
import { getCachedRate, setCachedRate } from '@/lib/fx/cache';
import { fetchRateToUsd } from '@/lib/fx/fetcher';
import { FxFetchError } from '@/lib/fx/errors';
import { en } from '@/lib/i18n/en';
import { SUPPORTED_CURRENCIES } from '@/lib/fx/supported-currencies';

export async function GET(req: NextRequest) {
  const currency = req.nextUrl.searchParams.get('currency');

  // 422 if currency param is absent, empty, or not in the supported list.
  if (!currency || !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    return NextResponse.json(
      { error: 'Unknown currency code' },
      { status: 422 },
    );
  }

  // Check session cache first (FR-FX-03).
  const cached = getCachedRate(currency);
  if (cached !== undefined) {
    return NextResponse.json({ currency, rateToUsd: cached });
  }

  // Cache miss — fetch from external API.
  try {
    const rateToUsd = await fetchRateToUsd(currency);
    setCachedRate(currency, rateToUsd);
    return NextResponse.json({ currency, rateToUsd });
  } catch (err) {
    if (err instanceof FxFetchError) {
      return NextResponse.json(
        { error: en.FX_RATE_FETCH_ERROR },
        { status: 502 },
      );
    }
    process.stderr.write(`[fx/rates] Unexpected error: ${String(err)}\n`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
