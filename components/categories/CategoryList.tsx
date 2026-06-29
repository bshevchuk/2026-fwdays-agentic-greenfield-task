'use client';
// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
import React, { useState } from 'react';
import { en } from '@/lib/i18n/en';
import type { CategoryFullRow } from '@/lib/categories/types';
import { CategoryForm } from './CategoryForm';
import { DeleteCategoryButton } from './DeleteCategoryButton';

interface CategoryListProps {
  initialCategories: CategoryFullRow[];
}

export function CategoryList({ initialCategories }: CategoryListProps) {
  const [categories, setCategories] = useState<CategoryFullRow[]>(initialCategories);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  function handleSaved(saved: CategoryFullRow) {
    setCategories((prev) => {
      const existing = prev.findIndex((c) => c.id === saved.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = saved;
        return next;
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowAddForm(false);
    setEditingId(null);
  }

  function handleDeleted(id: number) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{en.CATEGORIES_PAGE_TITLE}</h2>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {en.CATEGORIES_ADD}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="rounded border border-border p-4">
          <CategoryForm
            onSave={handleSaved}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <ul className="divide-y divide-border rounded border border-border">
        {categories.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            {en.CATEGORIES_EMPTY}
          </li>
        )}
        {categories.map((cat) => (
          <li key={cat.id} className="px-4 py-3">
            {editingId === cat.id ? (
              <div className="pt-1">
                <CategoryForm
                  initial={cat}
                  onSave={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden="true"
                  >
                    {cat.icon.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{cat.icon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(cat.id)}
                    className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Edit
                  </button>
                  <DeleteCategoryButton
                    categoryId={cat.id}
                    categoryName={cat.name}
                    onDeleted={handleDeleted}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
