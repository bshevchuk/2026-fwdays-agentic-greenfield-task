// @trace FR-CAT-01, FR-CAT-04
import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { listCategories, createCategory } from '@/lib/categories/service';
import type { CreateCategoryInput } from '@/lib/categories/types';

export async function GET() {
  try {
    const repo = getRepository();
    const result = listCategories(repo);
    return NextResponse.json(result.data, { status: 200 });
  } catch (e) {
    process.stderr.write(`[GET /api/categories] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCategoryInput;
    const repo = getRepository();
    const result = createCategory(repo, body);
    if (!result.ok) {
      const status = result.code === 'DUPLICATE_NAME' ? 409 : 422;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (e) {
    process.stderr.write(`[POST /api/categories] ${String(e)}\n`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
