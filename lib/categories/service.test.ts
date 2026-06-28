// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
// Service-layer unit tests for category CRUD operations.
// Uses an in-memory stub repo — no real SQLite involved.
// All tests MUST FAIL (red) until lib/categories/service.ts is implemented —
// the module does not exist yet, so the import below will produce "module not found".

import { describe, it, expect } from 'vitest';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
} from '@/lib/categories/service';

// ---------------------------------------------------------------------------
// Local type mirrors — matches what lib/categories/types.ts will export.
// Defined here so the mock compiles without importing non-existent modules.
// ---------------------------------------------------------------------------
interface CategoryFullRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget_limit: number | null;
}

interface MockRepo {
  ping(): boolean;
  countTransactions(): number;
  listCategories(): Array<{ id: number; name: string }>;
  getCategory(id: number): CategoryFullRow | undefined;
  createCategory(input: { name: string; icon: string; color: string }): CategoryFullRow;
  updateCategory(
    id: number,
    fields: { name?: string; icon?: string; color?: string },
  ): CategoryFullRow | undefined;
  deleteCategory(id: number): boolean;
  countTransactionsByCategory(categoryId: number): number;
}

// ---------------------------------------------------------------------------
// Factory — returns a fully-operational stub with safe defaults.
// Override individual methods per test with the overrides argument.
// ---------------------------------------------------------------------------
function createMockRepo(overrides: Partial<MockRepo> = {}): MockRepo {
  return {
    ping: () => true,
    countTransactions: () => 0,
    listCategories: () => [],
    getCategory: (_id) => undefined,
    createCategory: (input) => ({
      id: 1,
      name: input.name,
      icon: input.icon,
      color: input.color,
      budget_limit: null,
    }),
    updateCategory: (_id, _fields) => undefined,
    deleteCategory: (_id) => true,
    countTransactionsByCategory: (_categoryId) => 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createCategory (FR-CAT-01)
// ---------------------------------------------------------------------------
describe('createCategory', () => {
  it('returns { ok: true, data } for fully valid input', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, { name: 'Food', icon: 'utensils', color: '#ef4444' });
    expect(result).toMatchObject({
      ok: true,
      data: { id: 1, name: 'Food', icon: 'utensils', color: '#ef4444' },
    });
  });

  it('returned data shape includes budget_limit field', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, { name: 'Food', icon: 'utensils', color: '#ef4444' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('budget_limit' in result.data).toBe(true);
    }
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for blank name', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, { name: '  ', icon: 'utensils', color: '#ef4444' });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for empty name', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, { name: '', icon: 'utensils', color: '#ef4444' });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for name exceeding 50 characters', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, {
      name: 'x'.repeat(51),
      icon: 'utensils',
      color: '#ef4444',
    });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for an icon not in the allowed set', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, {
      name: 'Food',
      icon: 'bad-icon',
      color: '#ef4444',
    });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for a named CSS color instead of hex', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, { name: 'Food', icon: 'utensils', color: 'red' });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: VALIDATION_ERROR } for a hex color missing the leading hash', () => {
    const repo = createMockRepo();
    const result = createCategory(repo as never, {
      name: 'Food',
      icon: 'utensils',
      color: 'ef4444',
    });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('does not call repo.createCategory when validation fails', () => {
    let repoCalled = false;
    const repo = createMockRepo({
      createCategory: (input) => {
        repoCalled = true;
        return { id: 1, ...input, budget_limit: null };
      },
    });
    createCategory(repo as never, { name: '', icon: 'utensils', color: '#ef4444' });
    expect(repoCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateCategory (FR-CAT-02)
// ---------------------------------------------------------------------------
describe('updateCategory', () => {
  const originalCategory: CategoryFullRow = {
    id: 1,
    name: 'Food',
    icon: 'utensils',
    color: '#ef4444',
    budget_limit: null,
  };

  it('returns { ok: true, data } with updated name when only name is supplied', () => {
    const repo = createMockRepo({
      getCategory: (id) => (id === 1 ? originalCategory : undefined),
      updateCategory: (id, fields) =>
        id === 1 ? { ...originalCategory, ...fields } : undefined,
    });

    const result = updateCategory(repo as never, 1, { name: 'New Name' });
    expect(result).toMatchObject({
      ok: true,
      data: { id: 1, name: 'New Name', icon: 'utensils', color: '#ef4444' },
    });
  });

  it('preserves icon and color when only name is updated', () => {
    const repo = createMockRepo({
      getCategory: (id) => (id === 1 ? originalCategory : undefined),
      updateCategory: (id, fields) =>
        id === 1 ? { ...originalCategory, ...fields } : undefined,
    });

    const result = updateCategory(repo as never, 1, { name: 'New Name' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.icon).toBe('utensils');
      expect(result.data.color).toBe('#ef4444');
    }
  });

  it('returns { ok: false, code: VALIDATION_ERROR } when renaming to blank string', () => {
    const repo = createMockRepo({
      getCategory: (id) => (id === 1 ? originalCategory : undefined),
    });
    const result = updateCategory(repo as never, 1, { name: '' });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('returns { ok: false, code: NOT_FOUND } for a non-existent category id', () => {
    const repo = createMockRepo({ getCategory: () => undefined });
    const result = updateCategory(repo as never, 999, { name: 'X' });
    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// deleteCategory (FR-CAT-03)
// ---------------------------------------------------------------------------
describe('deleteCategory', () => {
  it('returns { ok: true } when category has zero associated transactions', () => {
    const repo = createMockRepo({
      countTransactionsByCategory: () => 0,
      deleteCategory: () => true,
    });
    const result = deleteCategory(repo as never, 1);
    expect(result).toMatchObject({ ok: true });
  });

  it('returns { ok: false, code: HAS_TRANSACTIONS } when category has 3 transactions', () => {
    const repo = createMockRepo({
      countTransactionsByCategory: () => 3,
    });
    const result = deleteCategory(repo as never, 1);
    expect(result).toMatchObject({ ok: false, code: 'HAS_TRANSACTIONS' });
  });

  it('returns { ok: false, code: HAS_TRANSACTIONS } when category has exactly 1 transaction', () => {
    const repo = createMockRepo({
      countTransactionsByCategory: () => 1,
    });
    const result = deleteCategory(repo as never, 1);
    expect(result).toMatchObject({ ok: false, code: 'HAS_TRANSACTIONS' });
  });

  it('does not call repo.deleteCategory when transactions exist', () => {
    let deleteCalled = false;
    const repo = createMockRepo({
      countTransactionsByCategory: () => 2,
      deleteCategory: () => {
        deleteCalled = true;
        return false;
      },
    });
    deleteCategory(repo as never, 1);
    expect(deleteCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getCategory (FR-CAT-04)
// ---------------------------------------------------------------------------
describe('getCategory', () => {
  it('returns { ok: false, code: NOT_FOUND } when the id does not exist', () => {
    const repo = createMockRepo({ getCategory: () => undefined });
    const result = getCategory(repo as never, 999);
    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('returns { ok: true, data } with the full category row when the category exists', () => {
    const category: CategoryFullRow = {
      id: 42,
      name: 'Entertainment',
      icon: 'film',
      color: '#f59e0b',
      budget_limit: null,
    };
    const repo = createMockRepo({
      getCategory: (id) => (id === 42 ? category : undefined),
    });
    const result = getCategory(repo as never, 42);
    expect(result).toMatchObject({ ok: true, data: category });
  });
});
