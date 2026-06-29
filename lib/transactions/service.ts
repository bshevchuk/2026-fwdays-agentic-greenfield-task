// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-06, FR-TX-07
// Framework-free service layer — no next/* or react imports (TC-PURE-01).

import type { IRepository } from '@/lib/db/repository';
import type {
  TransactionRow,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from './types';
import { validateCurrency, validateDate, validateType, validateNote } from './validation';
import { en } from '@/lib/i18n/en';

// Discriminated union helpers
type Ok<T> = { ok: true; data: T };
type Err = { ok: false; code: string; error: string };
type Result<T> = Ok<T> | Err;

function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

function err(code: string, error: string): Err {
  return { ok: false, code, error };
}

// ---------------------------------------------------------------------------
// listTransactions (FR-TX-06)
// Returns the repo array directly — filters are handled by the repository.
// ---------------------------------------------------------------------------
export function listTransactions(
  repo: IRepository,
  filters: TransactionFilters,
): TransactionRow[] {
  return repo.listTransactions(filters);
}

// ---------------------------------------------------------------------------
// createTransaction (FR-TX-01)
// Validates pre-computed amount_cents and other fields; does NOT call fetcher.
// ---------------------------------------------------------------------------
export function createTransaction(
  repo: IRepository,
  input: CreateTransactionInput,
): Result<TransactionRow> {
  // Validate amount_cents (route handler converts string → cents before calling service)
  if (!Number.isFinite(input.amount_cents) || input.amount_cents <= 0) {
    return err('VALIDATION_ERROR', en.TX_AMOUNT_NOT_POSITIVE);
  }
  if (!validateCurrency(input.currency)) {
    return err('VALIDATION_ERROR', en.TX_CURRENCY_INVALID);
  }
  if (!validateDate(input.date)) {
    return err('VALIDATION_ERROR', en.TX_DATE_INVALID);
  }
  if (!validateType(input.type)) {
    return err('VALIDATION_ERROR', en.TX_TYPE_INVALID);
  }
  if (!validateNote(input.note)) {
    return err('VALIDATION_ERROR', en.TX_NOTE_TOO_LONG);
  }

  try {
    const row = repo.createTransaction(input);
    return ok(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('FOREIGN KEY constraint failed')) {
      return err('VALIDATION_ERROR', en.TX_CATEGORY_REQUIRED);
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// updateTransaction (FR-TX-03)
// Validates any supplied partial fields; rate_to_usd is excluded per KD-4.
// ---------------------------------------------------------------------------
export function updateTransaction(
  repo: IRepository,
  id: number,
  input: UpdateTransactionInput,
): Result<TransactionRow> {
  // Validate only fields that are present in the partial input
  if (
    input.amount_cents !== undefined &&
    (!Number.isFinite(input.amount_cents) || input.amount_cents <= 0)
  ) {
    return err('VALIDATION_ERROR', en.TX_AMOUNT_NOT_POSITIVE);
  }
  if (input.currency !== undefined && !validateCurrency(input.currency)) {
    return err('VALIDATION_ERROR', en.TX_CURRENCY_INVALID);
  }
  if (input.date !== undefined && !validateDate(input.date)) {
    return err('VALIDATION_ERROR', en.TX_DATE_INVALID);
  }
  if (input.type !== undefined && !validateType(input.type)) {
    return err('VALIDATION_ERROR', en.TX_TYPE_INVALID);
  }
  if (!validateNote(input.note)) {
    return err('VALIDATION_ERROR', en.TX_NOTE_TOO_LONG);
  }

  const row = repo.updateTransaction(id, input);
  if (row === undefined) {
    return err('NOT_FOUND', en.TX_NOT_FOUND);
  }
  return ok(row);
}

// ---------------------------------------------------------------------------
// deleteTransaction (FR-TX-04)
// Maps repo boolean to discriminated-union result.
// ---------------------------------------------------------------------------
export function deleteTransaction(
  repo: IRepository,
  id: number,
): { ok: true } | Err {
  const deleted = repo.deleteTransaction(id);
  if (!deleted) {
    return err('NOT_FOUND', en.TX_NOT_FOUND);
  }
  return { ok: true };
}
