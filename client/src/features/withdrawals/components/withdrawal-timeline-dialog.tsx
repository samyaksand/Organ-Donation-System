import { ErrorState } from '@/components/common/error-state';
import { WorkflowTimeline } from '@/components/common/workflow-timeline';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useWithdrawalHistory } from '../hooks';
import type { AdminWithdrawal } from '@/types/api';

export function WithdrawalTimelineDialog({ request, onOpenChange }: { request: AdminWithdrawal | null; onOpenChange: (open: boolean) => void }) {
  const { data, isPending, isError, error, refetch, isFetching } = useWithdrawalHistory(request?.id);

  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdrawal request timeline</DialogTitle>
          <DialogDescription>
            {request?.donor.name} · <span className="font-mono">{request?.donor.donorCode}</span>
          </DialogDescription>
        </DialogHeader>
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
        ) : isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <WorkflowTimeline events={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}
