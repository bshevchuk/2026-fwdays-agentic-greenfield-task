// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03
import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import {
  getCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/categories/service';
import type { UpdateCategoryInput } from '@/lib/categories/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const repo = getRepository();
    const result = getCategory(repo, numericId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result.data, { status: 200 });
  } catch (e) {
    process.stderr.write(`[GET /api/categories/[id]] ${String(e)}\n`);
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
    const body = (await request.json()) as UpdateCategoryInput;
    const repo = getRepository();
    const result = updateCategory(repo, numericId, body);
    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 422;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data, { status: 200 });
  } catch (e) {
    process.stderr.write(`[PUT /api/categories/[id]] ${String(e)}\n`);
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
    const result = deleteCategory(repo, numericId);
    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 422;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    process.stderr.write(`[DELETE /api/categories/[id]] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
