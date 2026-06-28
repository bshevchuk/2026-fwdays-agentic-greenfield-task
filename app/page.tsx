// @trace FR-TX-01, FR-TX-02, FR-TX-06, FR-TX-07, FR-SHELL-03
// Server Component — thin shell that renders TransactionList.
// TransactionList (Client Component) fetches its own data and handles all
// mutation state, including the empty-state CTA per design decision KD-8.

import { TransactionList } from '@/components/transactions/TransactionList';

export default function Home() {
  return <TransactionList />;
}
