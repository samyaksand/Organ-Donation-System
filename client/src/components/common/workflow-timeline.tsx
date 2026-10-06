import { CheckCircle2, CirclePlus, type LucideIcon, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { WorkflowEvent } from '@/types/api';

const EVENT_ICON: Record<string, LucideIcon> = {
  CREATED: CirclePlus,
  APPROVED: CheckCircle2,
  DECLINED: XCircle,
  REJECTED: XCircle,
  CANCELLED: XCircle,
  WITHDRAWN: XCircle,
};

function describe(event: WorkflowEvent) {
  if (event.eventType === 'CREATED') return 'Submitted';
  if (event.toStatus === 'APPROVED') return 'Approved';
  if (event.toStatus === 'DECLINED') return 'Declined';
  if (event.toStatus === 'REJECTED') return 'Declined';
  if (event.toStatus === 'CANCELLED') return 'Cancelled';
  if (event.toStatus === 'WITHDRAWN') return 'Withdrawn';
  return `Status changed to ${event.toStatus ?? 'unknown'}`;
}

/**
 * A plain, reusable vertical timeline over a WorkflowEvent array - the shared visual piece for
 * every entity's workflow history view (organ requests, withdrawals, ...). Pass raw events in;
 * this component has no data-fetching of its own, so the same "created -> reviewed -> decided"
 * presentation stays consistent without duplicating the icon/line/label logic per entity.
 */
export function WorkflowTimeline({ events, emptyLabel = 'No recorded history yet.' }: { events: WorkflowEvent[]; emptyLabel?: string }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event, i) => {
        const Icon = EVENT_ICON[event.toStatus ?? ''] ?? CirclePlus;
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium">{describe(event)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
                {event.actor && <> · by {event.actor}</>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
