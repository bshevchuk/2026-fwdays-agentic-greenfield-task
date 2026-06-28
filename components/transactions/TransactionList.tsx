'use client';
// @trace FR-TX-01, FR-TX-02, FR-TX-03, FR-TX-04, FR-TX-06, FR-TX-07

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { en } from '@/lib/i18n/en';
import { TransactionFiltersBar } from './TransactionFilters';
import { TransactionForm } from './TransactionForm';
import type { TransactionRow, TransactionFilters } from '@/lib/transactions/types';
import type { CategoryFullRow } from '@/lib/categories/types';

const PAGE_SIZE = 25;

function currentLocalMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function truncateNote(note: string | null, max = 80): string {
  if (!note) return '';
  if (note.length <= max) return note;
  return note.slice(0, max) + '…';
}

interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <p id="delete-confirm-title" className="text-foreground">
          {en.TX_DELETE_CONFIRM}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            {en.TX_DELETE_CONFIRM_NO}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {en.TX_DELETE_CONFIRM_YES}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TxListResponse {
  transactions: TransactionRow[];
  total: number;
  page: number;
}

export function TransactionList() {
  const [filters, setFilters] = useState<TransactionFilters>({
    month: currentLocalMonth(),
  });
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  // hasLoaded tracks whether the first fetch has completed; avoids flash of empty-state.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [categories, setCategories] = useState<CategoryFullRow[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editRow, setEditRow] = useState<TransactionRow | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch categories once — setState only in .then() callback (async, not synchronous).
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json() as Promise<CategoryFullRow[]>)
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch transactions — all setState calls happen in .then()/.catch() callbacks,
  // never synchronously in the effect body, satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (filters.month) params.set('month', filters.month);
    if (filters.category_id !== undefined)
      params.set('category_id', String(filters.category_id));
    if (filters.type) params.set('type', filters.type);
    params.set('page', String(page));

    fetch(`/api/transactions?${params.toString()}`)
      .then((r) => r.json() as Promise<TxListResponse>)
      .then((data) => {
        if (cancelled) return;
        setTransactions(data.transactions ?? []);
        setTotal(data.total ?? 0);
        setHasLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setTransactions([]);
        setTotal(0);
        setHasLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  function handleFiltersChange(f: TransactionFilters) {
    setFilters(f);
    setPage(1);
  }

  function handleAddClick() {
    setFormMode('add');
    setEditRow(undefined);
    setShowForm(true);
  }

  function handleEditClick(row: TransactionRow) {
    setFormMode('edit');
    setEditRow(row);
    setShowForm(true);
  }

  function handleFormSuccess(tx: TransactionRow) {
    setShowForm(false);
    if (formMode === 'add') {
      // Refetch after add
      setHasLoaded(false);
      const params = new URLSearchParams();
      if (filters.month) params.set('month', filters.month);
      if (filters.category_id !== undefined)
        params.set('category_id', String(filters.category_id));
      if (filters.type) params.set('type', filters.type);
      params.set('page', String(page));

      fetch(`/api/transactions?${params.toString()}`)
        .then((r) => r.json() as Promise<TxListResponse>)
        .then((data) => {
          setTransactions(data.transactions ?? []);
          setTotal(data.total ?? 0);
          setHasLoaded(true);
        })
        .catch(() => {
          setHasLoaded(true);
        });
    } else {
      // Update the edited row in-place without a network round-trip
      setTransactions((prev) => prev.map((r) => (r.id === tx.id ? tx : r)));
    }
  }

  function handleFormCancel() {
    setShowForm(false);
  }

  function handleDeleteClick(id: number) {
    setDeleteTarget(id);
  }

  function handleDeleteConfirm() {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);

    fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.ok) {
          setTransactions((prev) => prev.filter((r) => r.id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
        }
      })
      .catch(() => {});
  }

  function getCategoryName(id: number | null): string {
    if (id === null) return '';
    return categories.find((c) => c.id === id)?.name ?? '';
  }

  // Before first load completes, render nothing (avoids flash of empty-state).
  if (!hasLoaded) {
    return <div data-testid="transaction-list" className="col-span-full" />;
  }

  // Global empty state — no transactions recorded at all and no filters applied.
  if (
    total === 0 &&
    transactions.length === 0 &&
    !filters.category_id &&
    !filters.type
  ) {
    return (
      <>
        <div
          data-testid="transaction-list"
          className="col-span-full flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center"
        >
          <h1 className="text-2xl font-semibold text-foreground">{en.EMPTY_STATE_HEADING}</h1>
          <p className="max-w-sm text-muted-foreground">{en.EMPTY_STATE_BODY}</p>
          <Button data-testid="add-first-transaction" onClick={handleAddClick}>
            {en.EMPTY_STATE_CTA}
          </Button>
        </div>

        {showForm && (
          <TransactionForm
            key={editRow?.id ?? 'new'}
            mode={formMode}
            initial={editRow}
            categories={categories}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}
      </>
    );
  }

  return (
    <div data-testid="transaction-list" className="col-span-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TransactionFiltersBar
          filters={filters}
          categories={categories}
          onFiltersChange={handleFiltersChange}
        />
        <Button onClick={handleAddClick} data-testid="add-transaction-button">
          {en.TX_ADD_BUTTON}
        </Button>
      </div>

      {/* List or empty-filter message */}
      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{en.TX_EMPTY_FILTER}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Note
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {formatAmount(tx.amount_cents, tx.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {getCategoryName(tx.category_id)}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        tx.type === 'income'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {tx.type === 'income' ? en.TX_TYPE_INCOME : en.TX_TYPE_EXPENSE}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate"
                    title={tx.note ?? ''}
                  >
                    {truncateNote(tx.note)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(tx)}
                      aria-label={`Edit transaction from ${tx.date}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(tx.id)}
                      aria-label={`Delete transaction from ${tx.date}`}
                    >
                      {en.TX_DELETE}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <TransactionForm
          key={editRow?.id ?? 'new'}
          mode={formMode}
          initial={editRow}
          categories={categories}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget !== null && (
        <DeleteConfirm
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
