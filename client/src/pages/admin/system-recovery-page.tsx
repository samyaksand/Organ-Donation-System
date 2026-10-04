import { AlertTriangle, Building2, CheckCircle2, HeartPulse, RotateCcw, ShieldAlert, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecoveryStatus, useRestoreDemoDatabase } from '@/features/admin/recovery-hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/api/client';
import { formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

export function SystemRecoveryPage() {
  useDocumentTitle('System recovery');
  const { data, isPending, isError, error, refetch, isFetching } = useRecoveryStatus();
  const restore = useRestoreDemoDatabase();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRestore = async () => {
    try {
      const result = await restore.mutateAsync();
      if (result.ok) {
        toast.success(result.message);
        setConfirmOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System recovery"
        description="Restore the public demo to its known-good state. Visible only to the Super Admin account."
      />

      <Alert variant="warning">
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>This page only affects demo data</AlertTitle>
        <AlertDescription>
          The public Demo Admin account can create, edit, or delete records while visitors try out the admin portal.
          Restoring replaces all of that with the last known-good snapshot. It does not touch real donor or hospital
          records on a deployment that isn&apos;t running in demo mode.
        </AlertDescription>
      </Alert>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !data.enabled ? (
        <EmptyState
          icon={ShieldAlert}
          title="Demo recovery is not enabled"
          description="Set DEMO_RECOVERY_ENABLED=true on this deployment to turn on System Recovery."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Donors" value={data.currentState.donorCount} icon={Users} />
            <StatCard label="Organs" value={data.currentState.organCount} icon={HeartPulse} />
            <StatCard label="Hospitals" value={data.currentState.hospitalCount} icon={Building2} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Known-good snapshot</CardTitle>
              <CardDescription>
                {data.snapshot.available
                  ? `Created ${formatDateTime(data.snapshot.createdAt)}.`
                  : 'No snapshot exists yet. Create one from the server with `npm run demo:snapshot`.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Restoring drops the current demo data and reloads this snapshot. This cannot be undone from the UI.
              </div>
              <Button
                variant="destructive"
                disabled={!data.snapshot.available}
                onClick={() => setConfirmOpen(true)}
              >
                <RotateCcw aria-hidden="true" /> Restore Demo Database
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last recovery attempt</CardTitle>
              <CardDescription>Who ran it, when, and whether it succeeded. No credentials or backup details are ever shown here.</CardDescription>
            </CardHeader>
            <CardContent>
              {!data.lastRecovery ? (
                <p className="text-sm text-muted-foreground">No recovery has been run yet.</p>
              ) : (
                <div className="flex items-start gap-3 text-sm">
                  {data.lastRecovery.status === 'SUCCEEDED' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">
                      {data.lastRecovery.status === 'SUCCEEDED' ? 'Succeeded' : 'Failed'} · {formatDateTime(data.lastRecovery.startedAt)}
                    </p>
                    <p className="text-muted-foreground">Initiated by {data.lastRecovery.initiatorEmail}</p>
                    {data.lastRecovery.message && <p className="text-muted-foreground">{data.lastRecovery.message}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Restore the demo database?"
        description={
          <>
            <p>
              This will permanently replace all current demo donors, organs, hospitals, and withdrawal requests with
              the known-good snapshot. Anything created or changed since then, including through the public Demo
              Admin account, will be lost.
            </p>
            <p className="mt-2 flex items-center gap-1.5 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> This cannot be undone.
            </p>
          </>
        }
        confirmLabel="Restore Demo Database"
        destructive
        loading={restore.isPending}
        onConfirm={handleRestore}
      />
    </div>
  );
}
