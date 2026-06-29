// @trace FR-BUDGET-01
import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { en } from '@/lib/i18n/en';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/categories/[id]/limit
 * Body: { limit: number | null }
 * - null clears the limit (saves NULL to budget_limit)
 * - positive number sets the limit
 * - zero or negative rejects with 422
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = (await request.json()) as { limit: unknown };
    const rawLimit = body.limit;

    // null means clear the limit
    if (rawLimit !== null) {
      if (typeof rawLimit !== 'number' || !isFinite(rawLimit) || rawLimit <= 0) {
        return NextResponse.json({ error: en.BUDGET_LIMIT_INVALID }, { status: 422 });
      }
    }

    const repo = getRepository();

    // Existence check
    const existing = repo.getCategory(numericId);
    if (!existing) {
      return NextResponse.json({ error: en.CATEGORIES_NOT_FOUND }, { status: 404 });
    }

    const updated = repo.updateCategory(numericId, {
      budget_limit: rawLimit === null ? null : (rawLimit as number),
    });

    if (!updated) {
      return NextResponse.json({ error: en.CATEGORIES_NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    process.stderr.write(`[PUT /api/categories/[id]/limit] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
