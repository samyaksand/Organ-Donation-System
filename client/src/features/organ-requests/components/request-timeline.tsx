import { ErrorState } from '@/components/common/error-state';
import { WorkflowTimeline } from '@/components/common/workflow-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganRequestHistory } from '../hooks';

/** Reconstructs the request's lifecycle from its own WorkflowEvent rows (see workflowEvent.service.ts). */
export function RequestTimeline({ requestId }: { requestId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useOrganRequestHistory(requestId);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return <WorkflowTimeline events={data} />;
}
