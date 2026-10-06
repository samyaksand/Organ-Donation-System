import { ArrowRight, Building2, CheckCircle2, Clock, FileClock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { OrganIcon } from '@/components/common/organ-icon';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { DonorStatusBadge } from '@/components/common/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOverview } from '@/features/admin/hooks';
import { useSession } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';
import { formatNumber, formatRelative } from '@/lib/format';

export function AdminDashboardPage() {
  useDocumentTitle('Admin dashboard');
  const { data: user } = useSession();
  const { data, isPending, isError, error, refetch, isFetching } = useAdminOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user?.admin?.displayName ?? 'administrator'}. Figures are live counts from the registry.`}
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Registered donors"
              value={data?.donors.total}
              loading={isPending}
              icon={Users}
              hint={
                data &&
                `${formatNumber(data.donors.ACTIVE)} active · ${formatNumber(data.donors.PENDING)} pending · ${formatNumber(data.donors.WITHDRAWN)} withdrawn`
              }
            />
            <StatCard
              label="Organs available"
              value={data?.organs.AVAILABLE}
              loading={isPending}
              icon={CheckCircle2}
              tone="success"
              hint={data && `${formatNumber(data.organs.total)} organ records in total`}
            />
            <StatCard
              label="Organs pending review"
              value={data?.organs.PENDING}
              loading={isPending}
              icon={Clock}
              tone="warning"
              hint={
                <Link to="/admin/organs?status=PENDING" className="font-medium text-primary hover:underline">
                  Review pending organs
                </Link>
              }
            />
            <StatCard
              label="Withdrawal requests"
              value={data?.pendingWithdrawals}
              loading={isPending}
              icon={FileClock}
              tone="info"
              hint={
                <Link to="/admin/withdrawals" className="font-medium text-primary hover:underline">
                  Open queue
                </Link>
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Available by organ type</CardTitle>
                <CardDescription>
                  Across {data ? formatNumber(data.hospitalCount) : '…'} hospital{data?.hospitalCount === 1 ? '' : 's'}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <div className="space-y-3">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-5 w-full" />
                    ))}
                  </div>
                ) : (
                  <ul className="divide-y">
                    {data.availableByType.map((t) => (
                      <li key={t.organType} className="flex items-center justify-between py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <OrganIcon type={t.organType} className="text-muted-foreground" />
                          {ORGAN_TYPE_LABELS[t.organType]}
                        </span>
                        <span className="font-medium tabular-nums">{formatNumber(t.count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle>Pending withdrawals</CardTitle>
                  <CardDescription>Latest requests awaiting review.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-40 w-full" />
                ) : data.recentWithdrawals.length === 0 ? (
                  <EmptyState icon={FileClock} title="No pending requests" className="py-8" />
                ) : (
                  <ul className="divide-y">
                    {data.recentWithdrawals.map((w) => (
                      <li key={w.id} className="py-3 first:pt-0">
                        <p className="text-sm font-medium">
                          {w.donor.name} <span className="font-mono text-xs text-muted-foreground">{w.donor.donorCode}</span>
                        </p>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{w.reason}</p>
                        <p className="text-xs text-muted-foreground">{formatRelative(w.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <Link to="/admin/withdrawals">
                    Manage requests <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Newest donors</CardTitle>
                <CardDescription>Most recent registrations.</CardDescription>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-40 w-full" />
                ) : data.recentDonors.length === 0 ? (
                  <EmptyState icon={Users} title="No donors yet" className="py-8" />
                ) : (
                  <ul className="divide-y">
                    {data.recentDonors.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 py-3 first:pt-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{d.donorCode}</span> · {d.city}
                          </p>
                        </div>
                        <DonorStatusBadge status={d.status} />
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <Link to="/admin/donors">
                    All donors <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Hospital information</p>
                <p className="text-sm text-muted-foreground">Keep hospital contact details accurate for public searches.</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/hospitals">Manage hospitals</Link>
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
