'use client';
// @trace FR-CAT-01, FR-CAT-02, FR-BUDGET-01
import React, { useState } from 'react';
import { en } from '@/lib/i18n/en';
import { ALLOWED_ICONS } from '@/lib/categories/validation';
import type { CategoryFullRow, CreateCategoryInput, UpdateCategoryInput } from '@/lib/categories/types';

interface CategoryFormProps {
  /** When provided, the form is in edit mode. */
  initial?: CategoryFullRow;
  onSave: (data: CategoryFullRow) => void;
  onCancel: () => void;
}

export function CategoryForm({ initial, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? ALLOWED_ICONS[0]);
  const [color, setColor] = useState(initial?.color ?? '#6366f1');
  // Budget limit: stored as string so empty == "no limit"
  const [budgetLimit, setBudgetLimit] = useState(
    initial?.budget_limit != null ? String(initial.budget_limit) : '',
  );
  const [limitError, setLimitError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLimitError(null);
    setSaving(true);

    try {
      // Validate budget limit inline before any network call
      let parsedLimit: number | null = null;
      if (budgetLimit.trim() !== '') {
        const n = parseFloat(budgetLimit);
        if (isNaN(n) || n <= 0) {
          setLimitError(en.BUDGET_LIMIT_INVALID);
          setSaving(false);
          return;
        }
        parsedLimit = n;
      }

      // Save core category fields
      const payload: CreateCategoryInput | UpdateCategoryInput = { name, icon, color };
      const url = initial ? `/api/categories/${initial.id}` : '/api/categories';
      const method = initial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Unexpected error');
        return;
      }

      const saved = (await res.json()) as CategoryFullRow;

      // If editing an existing category, update the limit via the dedicated endpoint
      if (initial) {
        const limitRes = await fetch(`/api/categories/${initial.id}/limit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: parsedLimit }),
        });
        if (!limitRes.ok) {
          const limitBody = (await limitRes.json()) as { error?: string };
          setLimitError(limitBody.error ?? 'Unexpected error updating limit');
          return;
        }
        const updatedWithLimit = (await limitRes.json()) as CategoryFullRow;
        onSave(updatedWithLimit);
        return;
      }

      // For new categories, if a limit was supplied, set it after creation
      if (parsedLimit !== null) {
        const limitRes = await fetch(`/api/categories/${saved.id}/limit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: parsedLimit }),
        });
        if (!limitRes.ok) {
          const limitBody = (await limitRes.json()) as { error?: string };
          setLimitError(limitBody.error ?? 'Unexpected error setting limit');
          return;
        }
        const updatedWithLimit = (await limitRes.json()) as CategoryFullRow;
        onSave(updatedWithLimit);
        return;
      }

      onSave(saved);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="cat-name" className="block text-sm font-medium text-foreground">
          {en.CATEGORIES_FORM_NAME}
        </label>
        <input
          id="cat-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          className="mt-1 block w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-foreground mb-1">
          {en.CATEGORIES_FORM_ICON}
        </p>
        <div className="grid grid-cols-6 gap-1" role="radiogroup" aria-label={en.CATEGORIES_FORM_ICON}>
          {ALLOWED_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              role="radio"
              aria-checked={icon === ic}
              onClick={() => setIcon(ic)}
              className={`rounded p-1.5 text-xs border transition-colors ${
                icon === ic
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              }`}
              title={ic}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="cat-color" className="block text-sm font-medium text-foreground">
          {en.CATEGORIES_FORM_COLOR}
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            id="cat-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-background p-0.5"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#6366f1"
            pattern="^#[0-9a-fA-F]{6}$"
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cat-budget-limit" className="block text-sm font-medium text-foreground">
          {en.BUDGET_LIMIT_LABEL}
        </label>
        <input
          id="cat-budget-limit"
          type="number"
          min="0"
          step="any"
          value={budgetLimit}
          onChange={(e) => {
            setBudgetLimit(e.target.value);
            setLimitError(null);
          }}
          placeholder={en.BUDGET_LIMIT_PLACEHOLDER}
          className="mt-1 block w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {limitError && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {limitError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          {en.CATEGORIES_CANCEL}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? '…' : en.CATEGORIES_SAVE}
        </button>
      </div>
    </form>
  );
}
