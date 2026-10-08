import { LogOut, Monitor, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useMySessions, useRevokeOtherSessions, useRevokeSession } from '../hooks';

/** Relative "last active" label - small and self-contained, no new date-fns-style dependency.
 * Returns the bare phrase ("Active now", "2 hours ago"); callers decide whether to prefix it
 * with "Last active" (never duplicated - "Active now" already reads correctly on its own). */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'Active now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function lastActiveLabel(iso: string, isCurrent: boolean): string {
  const rel = relativeTime(iso);
  if (isCurrent) return rel;
  return rel === 'Active now' ? 'Active now' : `Last active ${rel}`;
}

/**
 * Real server-side sessions (server/src/services/session.service.ts), not frontend/localStorage
 * state - revoking a session here immediately stops it from authenticating on the server (see
 * middleware/auth.ts's requireAuth, which checks UserSession on every request).
 */
export function ActiveSessions() {
  const { data, isPending, isError, error, refetch, isFetching } = useMySessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  const otherCount = (data ?? []).filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-4">
      {otherCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setConfirmRevokeAll(true)}>
            <LogOut aria-hidden="true" /> Sign out of all other sessions
          </Button>
        </div>
      )}

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((session) => (
            <Card key={session.id} className={session.isCurrent ? 'border-primary/40 bg-primary/5' : undefined}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Monitor className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{session.deviceLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {lastActiveLabel(session.lastUsedAt, session.isCurrent)} &middot; Created {formatDateTime(session.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {session.isCurrent ? (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Current device
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={revoke.isPending && revokingId === session.id}
                      onClick={() => {
                        setRevokingId(session.id);
                        revoke.mutate(session.id, { onSettled: () => setRevokingId(null) });
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Monitor} title="No active sessions" description="Sign in again to start a new tracked session." />
      )}

      <ConfirmDialog
        open={confirmRevokeAll}
        onOpenChange={setConfirmRevokeAll}
        title={`Sign out of ${otherCount} other device${otherCount === 1 ? '' : 's'}?`}
        description="Those devices will need to sign in again. Your current session stays active."
        confirmLabel="Sign out other sessions"
        destructive
        loading={revokeOthers.isPending}
        onConfirm={() => revokeOthers.mutate(undefined, { onSuccess: () => setConfirmRevokeAll(false) })}
      />
    </div>
  );
}
