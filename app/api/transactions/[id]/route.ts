// @trace FR-TX-02, FR-TX-03, FR-TX-04
// GET /api/transactions/[id]  — get one transaction
// PUT /api/transactions/[id]  — update (no rate re-fetch per KD-4)
// DELETE /api/transactions/[id] — delete with NOT_FOUND guard

import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { updateTransaction, deleteTransaction } from '@/lib/transactions/service';
import { validateAmount, validateCurrency, validateDate, validateType } from '@/lib/transactions/validation';
import { en } from '@/lib/i18n/en';
import type { UpdateTransactionInput } from '@/lib/transactions/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const repo = getRepository();
    const row = repo.getTransaction(numericId);
    if (!row) {
      return NextResponse.json({ error: en.TX_NOT_FOUND }, { status: 404 });
    }
    return NextResponse.json(row, { status: 200 });
  } catch (e) {
    process.stderr.write(`[GET /api/transactions/[id]] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const fields: UpdateTransactionInput = {};

    // Validate and map only supplied fields
    if ('amount' in body) {
      const rawAmount = String(body.amount ?? '');
      const amountResult = validateAmount(rawAmount);
      if (!amountResult.ok) {
        const isNonNumeric = isNaN(parseFloat(rawAmount.replace(',', '.')));
        const errMsg = isNonNumeric ? en.TX_AMOUNT_NOT_NUMBER : en.TX_AMOUNT_NOT_POSITIVE;
        return NextResponse.json({ error: errMsg }, { status: 422 });
      }
      fields.amount_cents = amountResult.cents!;
    }

    if ('currency' in body) {
      const currency = String(body.currency ?? '');
      if (!validateCurrency(currency)) {
        return NextResponse.json({ error: en.TX_CURRENCY_INVALID }, { status: 422 });
      }
      fields.currency = currency;
    }

    if ('date' in body) {
      const date = String(body.date ?? '');
      if (!validateDate(date)) {
        return NextResponse.json({ error: en.TX_DATE_INVALID }, { status: 422 });
      }
      fields.date = date;
    }

    if ('type' in body) {
      const type = String(body.type ?? '');
      if (!validateType(type)) {
        return NextResponse.json({ error: en.TX_TYPE_INVALID }, { status: 422 });
      }
      fields.type = type as 'expense' | 'income';
    }

    if ('category_id' in body) {
      fields.category_id = body.category_id != null ? Number(body.category_id) : null;
    }

    if ('note' in body) {
      fields.note = body.note != null ? String(body.note) : null;
    }

    const repo = getRepository();
    const result = updateTransaction(repo, numericId, fields);

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 422;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (e) {
    process.stderr.write(`[PUT /api/transactions/[id]] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const repo = getRepository();
    const result = deleteTransaction(repo, numericId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    process.stderr.write(`[DELETE /api/transactions/[id]] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
