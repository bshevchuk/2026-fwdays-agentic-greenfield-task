import { getRepository } from '@/lib/db';
import { EmptyState } from '@/components/EmptyState';

export default async function Home() {
  const repo = getRepository();
  const count = repo.countTransactions();
  if (count === 0) return <EmptyState />;
  return <div>Transactions will render here</div>;
}
