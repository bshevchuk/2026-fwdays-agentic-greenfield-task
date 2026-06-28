// @trace FR-TX-01, FR-TX-06, FR-TX-07
// GET /api/transactions — filtered, paginated list
// POST /api/transactions — create transaction (fetches FX rate)

import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { listTransactions, createTransaction } from '@/lib/transactions/service';
import { validateAmount, validateCurrency, validateDate, validateType } from '@/lib/transactions/validation';
import { en } from '@/lib/i18n/en';
import type { TransactionFilters } from '@/lib/transactions/types';

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawMonth = searchParams.get('month');
    const rawCategoryId = searchParams.get('category_id');
    const rawType = searchParams.get('type');
    const rawPage = searchParams.get('page');

    const filters: TransactionFilters = {};

    // Validate month format; fall back to current UTC year-month on invalid input
    if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
      filters.month = rawMonth;
    } else if (rawMonth) {
      filters.month = currentYearMonth();
    }

    if (rawCategoryId) {
      const n = Number(rawCategoryId);
      if (Number.isInteger(n) && n > 0) filters.category_id = n;
    }

    if (rawType === 'expense' || rawType === 'income') {
      filters.type = rawType;
    }

    const page = rawPage ? Math.max(1, parseInt(rawPage, 10) || 1) : 1;
    filters.page = page;

    const repo = getRepository();
    const transactions = listTransactions(repo, filters);
    const { month, category_id, type } = filters;
    const total = repo.countFilteredTransactions({ month, category_id, type });

    return NextResponse.json({
      transactions,
      total,
      page,
      pageSize: 25,
    });
  } catch (e) {
    process.stderr.write(`[GET /api/transactions] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Validate raw amount string
    const rawAmount = String(body.amount ?? '');
    if (!rawAmount) {
      return NextResponse.json({ error: en.TX_AMOUNT_REQUIRED }, { status: 422 });
    }
    const amountResult = validateAmount(rawAmount);
    if (!amountResult.ok) {
      const isNonNumeric = isNaN(parseFloat(rawAmount.replace(',', '.')));
      const errMsg = isNonNumeric ? en.TX_AMOUNT_NOT_NUMBER : en.TX_AMOUNT_NOT_POSITIVE;
      return NextResponse.json({ error: errMsg }, { status: 422 });
    }

    const currency = String(body.currency ?? '');
    if (!currency) {
      return NextResponse.json({ error: en.TX_CURRENCY_REQUIRED }, { status: 422 });
    }
    if (!validateCurrency(currency)) {
      return NextResponse.json({ error: en.TX_CURRENCY_INVALID }, { status: 422 });
    }

    const date = String(body.date ?? '');
    if (!date) {
      return NextResponse.json({ error: en.TX_DATE_REQUIRED }, { status: 422 });
    }
    if (!validateDate(date)) {
      return NextResponse.json({ error: en.TX_DATE_INVALID }, { status: 422 });
    }

    const type = String(body.type ?? '');
    if (!validateType(type)) {
      return NextResponse.json({ error: en.TX_TYPE_INVALID }, { status: 422 });
    }

    // Fetch FX rate from /api/fx/rates (KD-3)
    const rateUrl = new URL(`/api/fx/rates?currency=${encodeURIComponent(currency)}`, request.url);
    const rateRes = await fetch(rateUrl.toString());
    if (!rateRes.ok) {
      return NextResponse.json({ error: en.TX_FX_FETCH_FAILED }, { status: 502 });
    }
    const rateData = (await rateRes.json()) as { rateToUsd: number };
    const rateToUsd = rateData.rateToUsd;

    const categoryId = body.category_id != null ? Number(body.category_id) : null;
    const note = body.note != null ? String(body.note) : null;

    const repo = getRepository();
    const result = createTransaction(repo, {
      amount_cents: amountResult.cents!,
      currency,
      rate_to_usd: rateToUsd,
      date,
      category_id: categoryId,
      type: type as 'expense' | 'income',
      note,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (e) {
    process.stderr.write(`[POST /api/transactions] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
