'use client';
// @trace FR-TX-06

import { en } from '@/lib/i18n/en';
import type { TransactionFilters } from '@/lib/transactions/types';
import type { CategoryFullRow } from '@/lib/categories/types';

interface TransactionFiltersProps {
  filters: TransactionFilters;
  categories: CategoryFullRow[];
  onFiltersChange: (f: TransactionFilters) => void;
}

export function TransactionFiltersBar({
  filters,
  categories,
  onFiltersChange,
}: TransactionFiltersProps) {
  function handleMonth(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, month: e.target.value || undefined, page: 1 });
  }

  function handleCategory(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onFiltersChange({
      ...filters,
      category_id: val ? Number(val) : undefined,
      page: 1,
    });
  }

  function handleType(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onFiltersChange({
      ...filters,
      type: val === 'expense' || val === 'income' ? val : undefined,
      page: 1,
    });
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-month" className="text-sm font-medium text-foreground">
          {en.TX_FILTER_MONTH}
        </label>
        <input
          id="filter-month"
          type="month"
          value={filters.month ?? ''}
          onChange={handleMonth}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-category" className="text-sm font-medium text-foreground">
          {en.TX_FILTER_CATEGORY}
        </label>
        <select
          id="filter-category"
          value={filters.category_id?.toString() ?? ''}
          onChange={handleCategory}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{en.TX_FILTER_ALL_CATEGORIES}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-type" className="text-sm font-medium text-foreground">
          {en.TX_FILTER_TYPE}
        </label>
        <select
          id="filter-type"
          value={filters.type ?? ''}
          onChange={handleType}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{en.TX_FILTER_ALL_TYPES}</option>
          <option value="expense">{en.TX_TYPE_EXPENSE}</option>
          <option value="income">{en.TX_TYPE_INCOME}</option>
        </select>
      </div>
    </div>
  );
}
