// @trace FR-TX-01, FR-TX-02, FR-TX-06, FR-TX-07, FR-SHELL-03, FR-BUDGET-02, FR-CHART-01, FR-CHART-02
// Server Component — thin shell that renders BudgetDashboard, TransactionList, and ChartsDashboard.
// Client Components fetch their own data.

import { TransactionList } from '@/components/transactions/TransactionList';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { ChartsDashboard } from '@/components/charts/ChartsDashboard';

export default function Home() {
  return (
    <>
      <BudgetDashboard />
      <TransactionList />
      <ChartsDashboard />
    </>
  );
}
