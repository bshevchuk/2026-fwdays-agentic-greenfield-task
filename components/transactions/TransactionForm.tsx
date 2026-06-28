'use client';
// @trace FR-TX-01, FR-TX-03, FR-TX-05
// This component should be mounted with a unique key (e.g. key={initial?.id ?? 'new'})
// so that React remounts it when switching between add and edit modes, ensuring
// the initial state derived from props is always correct without a setState-in-effect.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { en } from '@/lib/i18n/en';
import { useDisplayCurrency } from '@/lib/fx/currency-context';
import { SUPPORTED_CURRENCIES } from '@/lib/fx/supported-currencies';
import type { TransactionRow } from '@/lib/transactions/types';
import type { CategoryFullRow } from '@/lib/categories/types';

interface TransactionFormProps {
  mode: 'add' | 'edit';
  initial?: TransactionRow;
  categories: CategoryFullRow[];
  onSuccess: (tx: TransactionRow) => void;
  onCancel: () => void;
}

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function TransactionForm({
  mode,
  initial,
  categories,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { displayCurrency } = useDisplayCurrency();

  // Derived once on mount; parent remounts via key when initial changes.
  const [amount, setAmount] = useState(
    initial ? String((initial.amount_cents / 100).toFixed(2)) : '',
  );
  const [currency, setCurrency] = useState(initial?.currency ?? displayCurrency);
  const [date, setDate] = useState(initial?.date ?? todayLocalDate());
  const [categoryId, setCategoryId] = useState(initial?.category_id?.toString() ?? '');
  const [type, setType] = useState<'expense' | 'income'>(initial?.type ?? 'expense');
  const [note, setNote] = useState(initial?.note ?? '');

  const [amountError, setAmountError] = useState('');
  const [currencyError, setCurrencyError] = useState('');
  const [dateError, setDateError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [currencySearch, setCurrencySearch] = useState('');
  const filteredCurrencies = SUPPORTED_CURRENCIES.filter((c) =>
    c.includes(currencySearch.toUpperCase()),
  );

  function validateFields(): boolean {
    let valid = true;

    if (!amount.trim()) {
      setAmountError(en.TX_AMOUNT_REQUIRED);
      valid = false;
    } else {
      const n = parseFloat(amount.replace(',', '.'));
      if (isNaN(n)) {
        setAmountError(en.TX_AMOUNT_NOT_NUMBER);
        valid = false;
      } else if (n <= 0) {
        setAmountError(en.TX_AMOUNT_NOT_POSITIVE);
        valid = false;
      } else {
        setAmountError('');
      }
    }

    if (!currency) {
      setCurrencyError(en.TX_CURRENCY_REQUIRED);
      valid = false;
    } else {
      setCurrencyError('');
    }

    if (!date) {
      setDateError(en.TX_DATE_REQUIRED);
      valid = false;
    } else {
      setDateError('');
    }

    if (!categoryId) {
      setCategoryError(en.TX_CATEGORY_REQUIRED);
      valid = false;
    } else {
      setCategoryError('');
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!validateFields()) return;

    setSubmitting(true);
    try {
      const url =
        mode === 'add' ? '/api/transactions' : `/api/transactions/${initial!.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';
      const body: Record<string, unknown> = {
        amount: amount.trim(),
        currency,
        date,
        category_id: categoryId ? Number(categoryId) : null,
        type,
        note: note || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        setSubmitError(
          typeof data.error === 'string' ? data.error : en.TX_SERVER_ERROR,
        );
        return;
      }

      onSuccess(data as unknown as TransactionRow);
    } catch {
      setSubmitError(en.TX_SERVER_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 id="tx-form-title" className="text-xl font-semibold text-foreground">
          {mode === 'add' ? en.TX_ADD_TITLE : en.TX_EDIT_TITLE}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label htmlFor="tx-amount" className="text-sm font-medium text-foreground">
              {en.TX_FORM_AMOUNT}
            </label>
            <input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-invalid={!!amountError}
              aria-describedby={amountError ? 'tx-amount-error' : undefined}
            />
            {amountError && (
              <p id="tx-amount-error" className="text-sm text-destructive" role="alert">
                {amountError}
              </p>
            )}
          </div>

          {/* Currency — searchable select */}
          <div className="flex flex-col gap-1">
            <label htmlFor="tx-currency-search" className="text-sm font-medium text-foreground">
              {en.TX_FORM_CURRENCY}
            </label>
            <input
              id="tx-currency-search"
              type="text"
              placeholder="Search currency..."
              value={currencySearch || currency}
              onChange={(e) => {
                setCurrencySearch(e.target.value.toUpperCase());
                setCurrency('');
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-invalid={!!currencyError}
              aria-describedby={currencyError ? 'tx-currency-error' : undefined}
            />
            {currencySearch && !currency && (
              <div className="border border-input rounded-md bg-background shadow-md max-h-40 overflow-y-auto">
                {filteredCurrencies.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
                ) : (
                  filteredCurrencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCurrency(c);
                        setCurrencySearch('');
                        setCurrencyError('');
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      {c}
                    </button>
                  ))
                )}
              </div>
            )}
            {currencyError && (
              <p id="tx-currency-error" className="text-sm text-destructive" role="alert">
                {currencyError}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label htmlFor="tx-date" className="text-sm font-medium text-foreground">
              {en.TX_FORM_DATE}
            </label>
            <input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-invalid={!!dateError}
              aria-describedby={dateError ? 'tx-date-error' : undefined}
            />
            {dateError && (
              <p id="tx-date-error" className="text-sm text-destructive" role="alert">
                {dateError}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label htmlFor="tx-category" className="text-sm font-medium text-foreground">
              {en.TX_FORM_CATEGORY}
            </label>
            <select
              id="tx-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (e.target.value) setCategoryError('');
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-invalid={!!categoryError}
              aria-describedby={categoryError ? 'tx-category-error' : undefined}
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </option>
              ))}
            </select>
            {categoryError && (
              <p id="tx-category-error" className="text-sm text-destructive" role="alert">
                {categoryError}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">{en.TX_FORM_TYPE}</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tx-type"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={() => setType('expense')}
                  className="accent-primary"
                />
                <span className="text-sm">{en.TX_TYPE_EXPENSE}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tx-type"
                  value="income"
                  checked={type === 'income'}
                  onChange={() => setType('income')}
                  className="accent-primary"
                />
                <span className="text-sm">{en.TX_TYPE_INCOME}</span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1">
            <label htmlFor="tx-note" className="text-sm font-medium text-foreground">
              {en.TX_FORM_NOTE}
            </label>
            <textarea
              id="tx-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              {en.TX_CANCEL}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '...' : en.TX_SAVE}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
