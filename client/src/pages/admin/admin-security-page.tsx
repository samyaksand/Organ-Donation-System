import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/features/analytics/components/period-selector';
import { SecurityAiGatewayTab } from '@/features/security/components/security-ai-gateway-tab';
import { SecurityDecisionsTab } from '@/features/security/components/security-decisions-tab';
import { SecurityOverviewTab } from '@/features/security/components/security-overview-tab';
import { SecurityViolationsTab } from '@/features/security/components/security-violations-tab';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { ANALYTICS_WINDOWS, type AnalyticsWindow, type AnalyticsWindowParams } from '@/types/api';

/**
 * Admin Security dashboard: real access-control and AI-gateway activity, never fabricated.
 * Security policies ENFORCE access (server/src/security/policyEngine.ts); this page only
 * displays what already happened - it has no control over any policy itself.
 */
export function AdminSecurityPage() {
  useDocumentTitle('Security');
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
        title="Security"
        description="Real-time access-control and AI Security Gateway activity: allow/deny decisions, policy violations, and blocked investigation requests."
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <Tabs value={tab} onValueChange={(v) => setFilter('tab', v === 'overview' ? '' : v)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="ai-gateway">AI Gateway</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SecurityOverviewTab period={period} />
        </TabsContent>
        <TabsContent value="decisions">
          <SecurityDecisionsTab period={period} />
        </TabsContent>
        <TabsContent value="ai-gateway">
          <SecurityAiGatewayTab period={period} />
        </TabsContent>
        <TabsContent value="violations">
          <SecurityViolationsTab period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
