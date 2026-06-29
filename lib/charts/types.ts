// @trace FR-CHART-01, FR-CHART-02

export interface DonutSlice {
  categoryId: number;
  categoryName: string;
  color: string;
  value: number;   // converted to display currency (decimal, not cents)
  percent: number; // 0-100
}

export interface MonthBar {
  month: string;    // human-readable, e.g. "Jun 2026"
  monthKey: string; // YYYY-MM for sorting
  income: number;   // converted to display currency
  expense: number;  // converted to display currency
}
