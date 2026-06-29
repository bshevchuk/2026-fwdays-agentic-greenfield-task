// @trace FR-TX-01, FR-TX-02, FR-TX-06, FR-TX-07, FR-SHELL-03, FR-BUDGET-02
// Server Component — thin shell that renders TransactionList and BudgetDashboard.
// Both are Client Components that fetch their own data.

import { TransactionList } from '@/components/transactions/TransactionList';
import { BudgetDashboard } from '@/components/BudgetDashboard';

export default function Home() {
  return (
    <>
      <BudgetDashboard />
      <TransactionList />
    </>
  );
}
