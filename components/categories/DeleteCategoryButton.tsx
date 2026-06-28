'use client';
// @trace FR-CAT-03
import React, { useState } from 'react';
import { en } from '@/lib/i18n/en';

interface DeleteCategoryButtonProps {
  categoryId: number;
  categoryName: string;
  onDeleted: (id: number) => void;
}

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  onDeleted,
}: DeleteCategoryButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Unexpected error');
        return;
      }
      onDeleted(categoryId);
    } catch {
      setError('Network error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <span>
      {error && (
        <span role="alert" className="mr-2 text-xs text-red-600">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`${en.CATEGORIES_DELETE} ${categoryName}`}
        className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
      >
        {deleting ? '…' : en.CATEGORIES_DELETE}
      </button>
    </span>
  );
}
