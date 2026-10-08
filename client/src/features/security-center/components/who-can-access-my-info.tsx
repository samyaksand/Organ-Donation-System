import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSecurityMatrix } from '@/features/security/hooks';
import type { SecurityPolicyDefinition } from '@/types/api';

interface ResourceExplainer {
  resource: SecurityPolicyDefinition['resource'];
  label: string;
}

const DONOR_RESOURCES: ResourceExplainer[] = [
  { resource: 'donor-profile', label: 'Profile' },
  { resource: 'donor-medical-info', label: 'Medical information' },
  { resource: 'donor-organ', label: 'Registered organs' },
  { resource: 'donor-next-of-kin', label: 'Next of kin' },
  { resource: 'donor-withdrawal', label: 'Withdrawal requests' },
];

const CLASSIFICATION_TONE: Record<string, string> = {
  PUBLIC: 'bg-success/10 text-success',
  PROTECTED: 'bg-warning/10 text-warning',
  SENSITIVE: 'bg-destructive/10 text-destructive',
};

/**
 * "Who can access my information?" - driven entirely by the EXISTING server-side policy engine
 * (server/src/security/policies.ts via GET /public/security/matrix), never a hardcoded frontend
 * authorization table. Scoped to the resources a donor's own account actually has: profile,
 * medical info, organs, next of kin, withdrawals.
 */
export function WhoCanAccessMyInfo() {
  const { data: matrix, isPending } = useSecurityMatrix();

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const policiesFor = (resource: string) => (matrix ?? []).filter((p) => p.resource === resource);

  return (
    <Accordion type="single" collapsible className="w-full">
      {DONOR_RESOURCES.map(({ resource, label }) => {
        const policies = policiesFor(resource);
        const ownAllow = policies.find((p) => p.role === 'DONOR' && p.decision === 'ALLOW');
        const classification = ownAllow?.classification ?? policies[0]?.classification ?? 'PROTECTED';
        const adminAllow = policies.find((p) => p.role === 'ADMIN' && p.decision === 'ALLOW');
        const publicAllow = policies.find((p) => p.role === 'PUBLIC' && p.decision === 'ALLOW');

        return (
          <AccordionItem key={resource} value={resource}>
            <AccordionTrigger className="gap-3">
              <span className="flex flex-1 items-center justify-between gap-3 pr-2">
                <span className="font-medium">{label}</span>
                <Badge className={CLASSIFICATION_TONE[classification]} variant="outline">
                  {classification}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-foreground">Who can access it</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  <li>You (the owning donor) - always</li>
                  {adminAllow && <li>Administrators - for registry management</li>}
                  {publicAllow && <li>The public - aggregate/non-identifying form only</li>}
                  {!adminAllow && !publicAllow && <li>No one else - owner-only access</li>}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Allowed operations</p>
                <p className="mt-1 text-muted-foreground">
                  {[...new Set(policies.filter((p) => p.decision === 'ALLOW').map((p) => p.action))].join(', ') || 'View only'}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Why it's protected</p>
                <p className="mt-1 text-muted-foreground">{ownAllow?.description ?? 'This is your own data and is never shown to another donor.'}</p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>Public analytics: {classification === 'PUBLIC' ? 'may use it' : 'never uses it'}</span>
                <span>AI investigation: {classification === 'SENSITIVE' ? 'never accesses it' : classification === 'PUBLIC' ? 'may reference aggregate figures' : 'admin tools only, never your identity'}</span>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
