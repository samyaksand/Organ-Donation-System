import { FileClock, HeartPulse, LogOut, UserPlus } from 'lucide-react';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { ActivityItem } from '@/types/api';

const ICONS = {
  ACCOUNT_CREATED: UserPlus,
  ORGAN_REGISTERED: HeartPulse,
  WITHDRAWAL_SUBMITTED: LogOut,
  WITHDRAWAL_REVIEWED: FileClock,
} as const;

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full border bg-card text-muted-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
            <time dateTime={item.occurredAt} title={formatDateTime(item.occurredAt)} className="text-xs text-muted-foreground">
              {formatRelative(item.occurredAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
