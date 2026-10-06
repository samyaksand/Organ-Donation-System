import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottlenecksTab } from '@/features/analytics/components/bottlenecks-tab';
import { DonorsTab } from '@/features/analytics/components/donors-tab';
import { HospitalsTab } from '@/features/analytics/components/hospitals-tab';
import { OrgansTab } from '@/features/analytics/components/organs-tab';
import { OverviewTab } from '@/features/analytics/components/overview-tab';
import { PeriodSelector } from '@/features/analytics/components/period-selector';
import { RequestsTab } from '@/features/analytics/components/requests-tab';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { ANALYTICS_WINDOWS, type AnalyticsWindow, type AnalyticsWindowParams } from '@/types/api';

/**
 * Management Analytics & Decision-Support dashboard. Every figure here comes from
 * server/src/services/analytics.service.ts (deterministic KPIs) - this page requests and
 * renders; it never computes an authoritative number itself. See CLAUDE.md for the
 * architecture this is a prerequisite layer for.
 */
export function AdminAnalyticsPage() {
  useDocumentTitle('Analytics');
  const { values, setFilter } = useListParams(['window', 'from', 'to', 'tab'] as const);

  const period: AnalyticsWindowParams =
    values.from && values.to
      ? { from: values.from, to: values.to }
      : { window: (ANALYTICS_WINDOWS as readonly string[]).includes(values.window) ? (values.window as AnalyticsWindow) : '30d' };

  const setPeriod = (next: AnalyticsWindowParams) => {
    if (next.from && next.to) {
      setFilter('from', next.from);
      setFilter('to', next.to);
      setFilter('window', '');
    } else {
      setFilter('window', next.window ?? '30d');
      setFilter('from', '');
      setFilter('to', '');
    }
  };

  const tab = values.tab || 'overview';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Management information system: deterministic KPIs, trends and operational bottlenecks drawn directly from the registry."
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <Tabs value={tab} onValueChange={(v) => setFilter('tab', v === 'overview' ? '' : v)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organs">Organs</TabsTrigger>
          <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab period={period} />
        </TabsContent>
        <TabsContent value="organs">
          <OrgansTab />
        </TabsContent>
        <TabsContent value="hospitals">
          <HospitalsTab />
        </TabsContent>
        <TabsContent value="donors">
          <DonorsTab period={period} />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsTab period={period} />
        </TabsContent>
        <TabsContent value="bottlenecks">
          <BottlenecksTab period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
