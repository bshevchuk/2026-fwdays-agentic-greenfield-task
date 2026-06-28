// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
import { getRepository } from '@/lib/db';
import { en } from '@/lib/i18n/en';
import { CategoryList } from '@/components/categories/CategoryList';
import type { CategoryFullRow } from '@/lib/categories/types';

export const metadata = { title: `${en.CATEGORIES_PAGE_TITLE} — ${en.APP_NAME}` };

export default function SettingsPage() {
  const repo = getRepository();
  const categories = repo.listCategories() as CategoryFullRow[];

  return (
    <div className="col-span-full space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">{en.CATEGORIES_PAGE_TITLE}</h1>
      <CategoryList initialCategories={categories} />
    </div>
  );
}
