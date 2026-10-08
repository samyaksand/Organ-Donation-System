import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountSecuritySummary } from '@/features/security-center/components/account-security-summary';
import { ActiveSessions } from '@/features/security-center/components/active-sessions';
import { SecurityActivityTimeline } from '@/features/security-center/components/security-activity-timeline';
import { SecurityOverviewCards } from '@/features/security-center/components/security-overview-cards';
import { WhoCanAccessMyInfo } from '@/features/security-center/components/who-can-access-my-info';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';

/**
 * My Security & Privacy: an interactive, personalized security center for the signed-in donor -
 * real server-side sessions and activity (not a static information page), built entirely on the
 * existing SecurityEvent/UserSession architecture and the existing policy engine. See
 * server/src/controllers/me.controller.ts and services/session.service.ts /
 * securityActivity.service.ts for the data this reads.
 */
export function DonorSecurityPage() {
  useDocumentTitle('My Security & Privacy');
  const { values, setFilter } = useListParams(['tab'] as const);
  const tab = values.tab || 'overview';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Security & Privacy"
        description="Review your account security, manage signed-in devices, and see who can access your information."
      />

      <Tabs value={tab} onValueChange={(v) => setFilter('tab', v === 'overview' ? '' : v)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Active sessions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & access</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SecurityOverviewCards onNavigate={(next) => setFilter('tab', next === 'overview' ? '' : next)} />
          <AccountSecuritySummary />
        </TabsContent>

        <TabsContent value="sessions">
          <ActiveSessions />
        </TabsContent>

        <TabsContent value="activity">
          <SecurityActivityTimeline />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Who can access your information, drawn directly from OrganFlow&rsquo;s access-control policy engine - never a hardcoded answer.
          </p>
          <WhoCanAccessMyInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
