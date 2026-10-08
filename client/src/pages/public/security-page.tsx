import { DataStatusBanner } from '@/components/common/data-status-banner';
import { PageHeader } from '@/components/common/page-header';
import { DataClassificationExplorer } from '@/features/security/components/data-classification-explorer';
import { PolicyExplorer } from '@/features/security/components/policy-explorer';
import { SecurityInvestigateSection } from '@/features/security/components/security-investigate-section';
import { useDocumentTitle } from '@/hooks/use-document-title';

/**
 * Public Privacy & Security page: how access control works, demonstrated interactively rather
 * than described in prose. Every decision shown here is the REAL server-side policy engine
 * decision (server/src/security/policyEngine.ts) - there is no separate, hard-coded frontend
 * answer. The AI Investigation section reuses the exact same public investigation pipeline as
 * the standalone Investigate page, including the same AI Security Gateway.
 */
export function SecurityPage() {
  useDocumentTitle('Privacy & Security');

  return (
    <div className="container max-w-4xl space-y-10 py-10">
      <div className="space-y-4">
        <PageHeader
          title="Privacy & Security"
          description="How OrganFlow decides who can see what. Role-based access control, resource ownership, and data-sensitivity rules enforce every request - this page lets you try it yourself."
        />
        <DataStatusBanner />
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Data classification</h2>
          <p className="text-sm text-muted-foreground">Every resource in OrganFlow falls into one of three sensitivity levels.</p>
        </div>
        <DataClassificationExplorer />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Policy Explorer</h2>
          <p className="text-sm text-muted-foreground">
            Pick an actor, a resource, and an action to see the real access decision, with the role, ownership, and sensitivity checks that produced it.
          </p>
        </div>
        <PolicyExplorer />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">AI Investigation</h2>
          <p className="text-sm text-muted-foreground">
            AI provides analysis and explanation only. OrganFlow&rsquo;s security policies enforce access - the AI agent can never grant or revoke access, change a role, or modify a policy.
          </p>
        </div>
        <SecurityInvestigateSection />
      </section>
    </div>
  );
}
