import { Eye, Lock, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface ClassificationInfo {
  label: string;
  icon: LucideIcon;
  tone: string;
  description: string;
  whoCanAccess: string;
  examples: string[];
}

const CLASSIFICATIONS: ClassificationInfo[] = [
  {
    label: 'PUBLIC',
    icon: Eye,
    tone: 'bg-success/10 text-success',
    description: 'No account needed. Aggregate or institutional information with no individual identity attached.',
    whoCanAccess: 'Anyone, including unauthenticated visitors.',
    examples: ['Organ availability search results', 'Hospital directory and contact details', 'Public aggregate analytics and trends'],
  },
  {
    label: 'PROTECTED',
    icon: Lock,
    tone: 'bg-warning/10 text-warning',
    description: 'Requires a signed-in account. For donor-scoped resources, also requires ownership of that specific record.',
    whoCanAccess: 'A signed-in donor for their own records, or an administrator for the operational console.',
    examples: ["A donor's own profile and registered organs", 'A withdrawal request and its status', 'Management analytics (administrators only)'],
  },
  {
    label: 'SENSITIVE',
    icon: ShieldAlert,
    tone: 'bg-destructive/10 text-destructive',
    description: 'Medical, next-of-kin, or security-audit detail. Requires ownership (for a donor) or an administrator role, with no exception for another signed-in donor.',
    whoCanAccess: 'The owning donor only, or an administrator - never another donor, regardless of role.',
    examples: ["A donor's medical conditions and next-of-kin details", 'Full donor records in the admin console', 'The security audit dashboard and AI gateway decisions'],
  },
];

/** Explains the PUBLIC / PROTECTED / SENSITIVE data-classification axis used by the policy
 * engine's ABAC check, for a general audience - see server/src/security/policies.ts. */
export function DataClassificationExplorer() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CLASSIFICATIONS.map((c) => (
        <Card key={c.label}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}>
                <c.icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="font-semibold">{c.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Who can access it</p>
              <p className="mt-1 text-sm">{c.whoCanAccess}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Examples</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                {c.examples.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
