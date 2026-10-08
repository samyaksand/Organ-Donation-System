import { CheckCircle2, Clock3, History, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useMyActivity } from '../hooks';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Signed in',
  LOGOUT: 'Signed out',
  REVOKE_SESSION: 'Revoked another session',
  REVOKE_OTHER_SESSIONS: 'Signed out of other devices',
  PASSWORD_CHANGED: 'Changed password',
  CREATE: 'Created a record',
  UPDATE: 'Updated a record',
};

const RESOURCE_LABELS: Record<string, string> = {
  'auth-session': 'Account session',
  'auth-password': 'Account password',
  'donor-profile': 'Profile',
  'donor-organ': 'Registered organ',
  'donor-withdrawal': 'Withdrawal request',
};

/**
 * The current user's OWN recent security activity, built entirely on the existing SecurityEvent
 * table (server/src/services/securityActivity.service.ts's getMyActivity) - not a second
 * logging system, and never another user's events (the server scopes this by the authenticated
 * caller's own id).
 */
export function SecurityActivityTimeline() {
  const { data, isPending, isError, error, refetch, isFetching } = useMyActivity();

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Sign-ins and account changes will appear here." />;
  }

  return (
    <ol className="space-y-1">
      {data.map((item, i) => {
        const allowed = item.decision === 'ALLOW';
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
            {i < data.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px bg-border" aria-hidden="true" />}
            <span
              className={`z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                allowed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {allowed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{ACTION_LABELS[item.action] ?? item.action}</span>
                <span className="text-xs text-muted-foreground">{RESOURCE_LABELS[item.resource] ?? item.resource}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.reason}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden="true" /> {formatDateTime(item.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
