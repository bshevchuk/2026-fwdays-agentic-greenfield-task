// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
import { en } from '@/lib/i18n/en';
import type { IRepository } from '@/lib/db/repository';
import type { CategoryFullRow, CreateCategoryInput, UpdateCategoryInput } from './types';
import { validateName, validateColor, validateIcon } from './validation';

// Discriminated union returned by all service functions.
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; code: string; error: string };
type Result<T> = Ok<T> | Err;

function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

function err(code: string, error: string): Err {
  return { ok: false, code, error };
}

// --------------------------------------------------------------------------
// listCategories
// --------------------------------------------------------------------------
export function listCategories(repo: IRepository): Ok<CategoryFullRow[]> {
  return ok(repo.listCategories() as CategoryFullRow[]);
}

// --------------------------------------------------------------------------
// getCategory
// --------------------------------------------------------------------------
export function getCategory(
  repo: IRepository,
  id: number,
): Result<CategoryFullRow> {
  const row = repo.getCategory(id);
  if (!row) return err('NOT_FOUND', en.CATEGORIES_NOT_FOUND);
  return ok(row as CategoryFullRow);
}

// --------------------------------------------------------------------------
// createCategory
// --------------------------------------------------------------------------
export function createCategory(
  repo: IRepository,
  input: CreateCategoryInput,
): Result<CategoryFullRow> {
  if (!validateName(input.name)) {
    return err('VALIDATION_ERROR', en.CATEGORIES_NAME_REQUIRED);
  }
  if (!validateColor(input.color)) {
    return err('VALIDATION_ERROR', en.CATEGORIES_COLOR_INVALID);
  }
  if (!validateIcon(input.icon)) {
    return err('VALIDATION_ERROR', en.CATEGORIES_ICON_INVALID);
  }

  try {
    const row = repo.createCategory({
      name: input.name.trim(),
      icon: input.icon,
      color: input.color,
    });
    return ok(row as CategoryFullRow);
  } catch (e) {
    // Catch UNIQUE constraint violation (SQLite error code SQLITE_CONSTRAINT_UNIQUE)
    if (
      e instanceof Error &&
      'code' in e &&
      typeof (e as { code: unknown }).code === 'string' &&
      ((e as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        (e as { code: string }).code === 'SQLITE_CONSTRAINT')
    ) {
      return err('DUPLICATE_NAME', en.CATEGORIES_NAME_DUPLICATE);
    }
    throw e;
  }
}

// --------------------------------------------------------------------------
// updateCategory
// --------------------------------------------------------------------------
export function updateCategory(
  repo: IRepository,
  id: number,
  input: UpdateCategoryInput,
): Result<CategoryFullRow> {
  // Existence check first
  const existing = repo.getCategory(id);
  if (!existing) return err('NOT_FOUND', en.CATEGORIES_NOT_FOUND);

  // Validate only supplied fields
  if (input.name !== undefined && !validateName(input.name)) {
    return err('VALIDATION_ERROR', en.CATEGORIES_NAME_REQUIRED);
  }
  if (input.color !== undefined && !validateColor(input.color)) {
    return err('VALIDATION_ERROR', en.CATEGORIES_COLOR_INVALID);
  }
  if (input.icon !== undefined && !validateIcon(input.icon)) {
    return err('VALIDATION_ERROR', en.CATEGORIES_ICON_INVALID);
  }

  const trimmedInput: UpdateCategoryInput = { ...input };
  if (trimmedInput.name !== undefined) {
    trimmedInput.name = trimmedInput.name.trim();
  }

  try {
    const updated = repo.updateCategory(id, trimmedInput);
    if (!updated) return err('NOT_FOUND', en.CATEGORIES_NOT_FOUND);
    return ok(updated as CategoryFullRow);
  } catch (e) {
    if (
      e instanceof Error &&
      'code' in e &&
      typeof (e as { code: unknown }).code === 'string' &&
      ((e as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        (e as { code: string }).code === 'SQLITE_CONSTRAINT')
    ) {
      return err('DUPLICATE_NAME', en.CATEGORIES_NAME_DUPLICATE);
    }
    throw e;
  }
}

// --------------------------------------------------------------------------
// deleteCategory
// --------------------------------------------------------------------------
export function deleteCategory(
  repo: IRepository,
  id: number,
): Result<{ deleted: boolean }> {
  if (!repo.getCategory(id)) {
    return err('NOT_FOUND', en.CATEGORIES_NOT_FOUND);
  }
  const count = repo.countTransactionsByCategory(id);
  if (count > 0) {
    return err('HAS_TRANSACTIONS', en.CATEGORIES_DELETE_HAS_TRANSACTIONS);
  }
  repo.deleteCategory(id);
  return ok({ deleted: true });
}
