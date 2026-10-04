import { AlertTriangle, ArrowRight, CheckCircle2, Clock, HeartPulse, Plus, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { OrganIconTile } from '@/components/common/organ-icon';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { DonorStatusBadge, OrganStatusBadge, WithdrawalStatusBadge } from '@/components/common/status-badges';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityTimeline } from '@/features/donors/components/activity-timeline';
import { useMyDashboard } from '@/features/donors/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { organLabel } from '@/lib/domain';
import { formatDate, formatDateTime } from '@/lib/format';

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function DonorDashboardPage() {
  useDocumentTitle('Donor dashboard');
  const { data, isPending, isError, error, refetch, isFetching } = useMyDashboard();

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  const { profile, organs, latestWithdrawal, activity } = data;
  const withdrawn = profile.status === 'WITHDRAWN';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile.firstName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Donor ID <span className="font-mono font-medium text-foreground">{profile.donorCode}</span>
            <DonorStatusBadge status={profile.status} />
          </span>
        }
        actions={
          !withdrawn && (
            <Button asChild>
              <Link to="/donor/organs/new">
                <Plus aria-hidden="true" /> Add organ
              </Link>
            </Button>
          )
        }
      />

      {withdrawn && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Your registration has been withdrawn</AlertTitle>
          <AlertDescription>
            Your organ records are no longer listed as available. Contact an administrator if you would like to reactivate your
            registration.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered organs" value={organs.total} icon={HeartPulse} />
        <StatCard label="Available" value={organs.byStatus.AVAILABLE} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending review" value={organs.byStatus.PENDING} icon={Clock} tone="warning" hint="Awaiting hospital verification" />
        <Card className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Withdrawal request</p>
          <div className="mt-2">
            {latestWithdrawal ? (
              <div className="space-y-1">
                <WithdrawalStatusBadge status={latestWithdrawal.status} />
                <p className="text-xs text-muted-foreground">Submitted {formatDateTime(latestWithdrawal.createdAt)}</p>
              </div>
            ) : (
              <p className="text-sm">None submitted</p>
            )}
          </div>
          <Link to="/donor/withdrawal" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle>Your organs</CardTitle>
              <CardDescription>Most recently registered organ records.</CardDescription>
            </div>
            {organs.total > 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/donor/organs">View all</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {organs.recent.length === 0 ? (
              <EmptyState
                icon={HeartPulse}
                title="No organs registered yet"
                description="Record the organs you are pledging and the hospital that will handle them."
                action={
                  !withdrawn && (
                    <Button asChild>
                      <Link to="/donor/organs/new">
                        <Plus aria-hidden="true" /> Add your first organ
                      </Link>
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="divide-y">
                {organs.recent.map((organ) => (
                  <li key={organ.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <OrganIconTile type={organ.organType} />
                      <div className="min-w-0">
                        <p className="font-medium">{organLabel(organ)}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {organ.hospital.name} · {formatDate(organ.procurementDate)}
                        </p>
                      </div>
                    </div>
                    <OrganStatusBadge status={organ.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Changes to your registration.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={activity} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Care details</CardTitle>
            <CardDescription>Keep these up to date so hospitals can reach the right people.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/donor/profile">
              <UserRound aria-hidden="true" /> Edit profile
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Registered hospital</dt>
              <dd className="mt-0.5 font-medium">{profile.hospital ? `${profile.hospital.name}, ${profile.hospital.city}` : 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Personal doctor</dt>
              <dd className="mt-0.5 font-medium">{profile.personalDoctor ?? 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Next of kin</dt>
              <dd className="mt-0.5 font-medium">
                {profile.nextOfKin ? `${profile.nextOfKin.name} · ${profile.nextOfKin.phone}` : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Medical conditions</dt>
              <dd className="mt-0.5 line-clamp-2 font-medium">{profile.medicalConditions ?? 'None recorded'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
