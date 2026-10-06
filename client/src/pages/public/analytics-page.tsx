import { AlertTriangle, Building2, CheckCircle2, MessageSquareText, Package, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarList } from '@/components/common/bar-list';
import { DataStatusBanner } from '@/components/common/data-status-banner';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { TrendBars } from '@/components/common/trend-bars';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/features/analytics/components/kpi-card';
import { usePublicBreaches, usePublicConcentration, usePublicHospitals, usePublicOrgans, usePublicOverview, usePublicTrends } from '@/features/public/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';

/**
 * Public Analytics: the same deterministic figures the admin dashboard uses, narrowed to
 * aggregate-only data (see server/src/services/publicAnalytics.service.ts). No authentication,
 * no donor/withdrawal/organ-request detail - just organ/hospital availability, concentration and
 * trends, with an "Ask about this" entry point into the public Investigate page.
 */
export function PublicAnalyticsPage() {
  useDocumentTitle('Analytics');
  const overview = usePublicOverview();
  const organs = usePublicOrgans();
  const hospitals = usePublicHospitals();
  const concentration = usePublicConcentration();
  const trends = usePublicTrends();
  const breaches = usePublicBreaches();

  if (overview.isError) {
    return (
      <div className="container py-10">
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} title="Analytics is temporarily unavailable" />
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-10">
      <PageHeader
        title="Analytics"
        description="Live, aggregate figures from OrganFlow's own registry - organ availability, hospital network activity, and trends. No account needed."
        actions={
          <Button asChild>
            <Link to="/investigate">
              <Sparkles aria-hidden="true" /> Investigate
            </Link>
          </Button>
        }
      />
      <DataStatusBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Available organs"
          value={overview.data?.organs.AVAILABLE}
          loading={overview.isPending}
          icon={CheckCircle2}
          tone="success"
          explain="Organ records currently marked available across the whole network."
          hint={overview.data && `${overview.data.organs.total} total organ records`}
          href="/organs?availability=AVAILABLE"
        />
        <KpiCard
          label="Hospitals"
          value={overview.data?.hospitals.total}
          loading={overview.isPending}
          icon={Building2}
          explain="Hospitals in the network. 'With availability' means at least one organ is currently available there."
          hint={overview.data && `${overview.data.hospitals.withAvailability} with availability`}
          href="/hospitals"
        />
        <KpiCard
          label="Pending verification"
          value={overview.data?.organs.PENDING}
          loading={overview.isPending}
          icon={Package}
          tone="warning"
          explain="Organ records submitted but not yet verified."
        />
        <KpiCard
          label="Zero-availability hospitals"
          value={overview.data?.hospitals.zeroAvailability}
          loading={overview.isPending}
          icon={AlertTriangle}
          tone={overview.data && overview.data.hospitals.zeroAvailability > 0 ? 'destructive' : 'default'}
          explain="Hospitals with no currently-available organs."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle>Availability by organ type</CardTitle>
              <CardDescription>Available vs. total records per type.</CardDescription>
            </div>
            <AskAboutThisButton question="Which organ types have the highest availability?" />
          </CardHeader>
          <CardContent>
            {organs.isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : organs.isError ? (
              <ErrorState error={organs.error} onRetry={() => void organs.refetch()} />
            ) : (
              <BarList
                items={organs.data!.byOrganType
                  .filter((t) => t.total > 0)
                  .map((t) => ({
                    key: t.organType,
                    label: ORGAN_TYPE_LABELS[t.organType],
                    value: t.available,
                    sublabel: `of ${t.total}`,
                    tone: t.available === 0 ? 'destructive' : 'default',
                    href: `/organs?organType=${t.organType}`,
                  }))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle>Availability by hospital</CardTitle>
              <CardDescription>Hospitals ranked by available organ count.</CardDescription>
            </div>
            <AskAboutThisButton question="Which hospitals currently have available organs?" />
          </CardHeader>
          <CardContent>
            {hospitals.isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : hospitals.isError ? (
              <ErrorState error={hospitals.error} onRetry={() => void hospitals.refetch()} />
            ) : hospitals.data!.hospitals.length === 0 ? (
              <EmptyState icon={Building2} title="No hospitals represented yet" description="Hospital availability will appear here once the demo dataset includes organ records." />
            ) : (
              <BarList
                items={hospitals
                  .data!.hospitals.slice(0, 10)
                  .map((h) => ({ key: h.id, label: h.name, value: h.available, sublabel: h.city, tone: h.available === 0 ? 'destructive' : 'default', href: `/hospitals` }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle>Availability concentration</CardTitle>
            <CardDescription>
              {concentration.data?.topHospital
                ? `${concentration.data.topHospital.hospitalName} holds ${concentration.data.topHospital.sharePercent}% of all available organs.`
                : 'Share of available organs held by each hospital.'}
            </CardDescription>
          </div>
          <AskAboutThisButton question="Where is organ availability concentrated?" />
        </CardHeader>
        <CardContent>
          {concentration.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : concentration.isError ? (
            <ErrorState error={concentration.error} onRetry={() => void concentration.refetch()} />
          ) : (
            <BarList
              items={concentration.data!.byHospital.slice(0, 8).map((h) => ({ key: h.hospitalId, label: h.hospitalName, value: h.sharePercent, sublabel: `${h.available} available` }))}
              emptyLabel="No available organs to show concentration for right now."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle>Organ registration trend</CardTitle>
            <CardDescription>{trends.data?.window.label ?? 'Last 30 days'}</CardDescription>
          </div>
          <AskAboutThisButton question="What changed recently in organ registrations?" />
        </CardHeader>
        <CardContent>
          {trends.isPending ? (
            <Skeleton className="h-28 w-full" />
          ) : trends.isError ? (
            <ErrorState error={trends.error} onRetry={() => void trends.refetch()} />
          ) : (
            <TrendBars data={trends.data.organRegistrations} label="organ registrations" />
          )}
        </CardContent>
      </Card>

      {!breaches.isPending && breaches.data && breaches.data.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" /> Notable operational conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {breaches.data.map((b) => (
              <div key={b.id}>
                <p className="font-medium">{b.title}</p>
                <p className="text-muted-foreground">{b.evidence}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" asChild>
              <Link to="/investigate">
                <MessageSquareText aria-hidden="true" /> Ask about this
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AskAboutThisButton({ question }: { question: string }) {
  return (
    <Button size="sm" variant="ghost" asChild className="shrink-0">
      <Link to={`/investigate?q=${encodeURIComponent(question)}`}>
        <MessageSquareText aria-hidden="true" /> <span className="hidden sm:inline">Ask about this</span>
      </Link>
    </Button>
  );
}
