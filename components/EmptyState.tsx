import { Button } from '@/components/ui/button';
import { en } from '@/lib/i18n/en';

export function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{en.EMPTY_STATE_HEADING}</h1>
      <p className="max-w-sm text-muted-foreground">{en.EMPTY_STATE_BODY}</p>
      {/* TODO(add-transactions): wire onClick to open the transaction form modal */}
      <Button data-testid="add-first-transaction">{en.EMPTY_STATE_CTA}</Button>
    </div>
  );
}
