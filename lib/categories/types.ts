// @trace FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-CAT-04
export interface CategoryFullRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget_limit: number | null;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
}
