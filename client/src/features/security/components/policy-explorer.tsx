import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExplorePolicy } from '../hooks';
import type { ExplorePolicyParams, SecurityActorRole, SecurityResource, SecurityResourceAction } from '@/types/api';

const ROLES: SecurityActorRole[] = ['PUBLIC', 'DONOR', 'ADMIN', 'SUPER_ADMIN'];

const RESOURCE_OPTIONS: Array<{ value: SecurityResource; label: string; action: SecurityResourceAction }> = [
  { value: 'organ-availability', label: 'Organ availability', action: 'VIEW' },
  { value: 'public-analytics', label: 'Public analytics', action: 'VIEW' },
  { value: 'donor-profile', label: "A donor's own profile", action: 'VIEW' },
  { value: 'donor-medical-info', label: "A donor's medical information", action: 'VIEW' },
  { value: 'admin-donor-records', label: 'Admin donor records', action: 'VIEW' },
  { value: 'admin-analytics', label: 'Admin management analytics', action: 'VIEW' },
  { value: 'admin-investigation', label: 'Admin AI investigation', action: 'INVESTIGATE' },
  { value: 'security-admin', label: 'Security audit dashboard', action: 'VIEW' },
];

const PRESETS: Array<{ label: string; input: ExplorePolicyParams }> = [
  { label: "Donor → Own profile → View", input: { role: 'DONOR', resource: 'donor-profile', action: 'VIEW', ownership: 'own' } },
  { label: "Donor → Another donor's medical info → View", input: { role: 'DONOR', resource: 'donor-medical-info', action: 'VIEW', ownership: 'other' } },
  { label: 'Public → Organ availability → View', input: { role: 'PUBLIC', resource: 'organ-availability', action: 'VIEW' } },
  { label: 'Public → Donor information → View', input: { role: 'PUBLIC', resource: 'admin-donor-records', action: 'VIEW' } },
  { label: "Donor → Another donor's profile → View", input: { role: 'DONOR', resource: 'donor-profile', action: 'VIEW', ownership: 'other' } },
];

/**
 * Interactive Actor -> Resource -> Action -> Context -> Evaluate flow for non-logged-in
 * visitors. Calls the real server-side policy engine (POST /public/security/explore) - the
 * result shown is the actual decision the server would make, never a hard-coded frontend table.
 */
export function PolicyExplorer() {
  const [role, setRole] = useState<SecurityActorRole>('DONOR');
  const [resource, setResource] = useState<SecurityResource>('donor-profile');
  const [ownership, setOwnership] = useState<'own' | 'other'>('own');
  const explore = useExplorePolicy();

  const selectedResource = RESOURCE_OPTIONS.find((r) => r.value === resource) ?? RESOURCE_OPTIONS[0]!;

  const run = (input?: ExplorePolicyParams) => {
    explore.mutate(input ?? { role, resource, action: selectedResource.action, ownership });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            onClick={() => {
              setRole(p.input.role);
              setResource(p.input.resource);
              setOwnership(p.input.ownership ?? 'own');
              run(p.input);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Actor</Label>
              <Select value={role} onValueChange={(v) => setRole(v as SecurityActorRole)}>
                <SelectTrigger aria-label="Actor role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Resource</Label>
              <Select value={resource} onValueChange={(v) => setResource(v as SecurityResource)}>
                <SelectTrigger aria-label="Resource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Context</Label>
              <Select value={ownership} onValueChange={(v) => setOwnership(v as 'own' | 'other')} disabled={!resource.startsWith('donor-')}>
                <SelectTrigger aria-label="Ownership context">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own resource</SelectItem>
                  <SelectItem value="other">Another user&rsquo;s resource</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => run()} loading={explore.isPending}>
            <Search aria-hidden="true" /> Evaluate
          </Button>
        </CardContent>
      </Card>

      {explore.data && (
        <Card className={explore.data.decision === 'ALLOW' ? 'border-success/40' : 'border-destructive/40'}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              {explore.data.decision === 'ALLOW' ? (
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              )}
              <span className="text-lg font-semibold">{explore.data.decision}</span>
              <Badge variant="outline" className="ml-auto">
                {explore.data.classification}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{explore.data.reason}</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role check</dt>
                <dd className="mt-1">{explore.data.roleCheck.detail}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ownership check</dt>
                <dd className="mt-1">{explore.data.ownershipCheck.applicable ? explore.data.ownershipCheck.detail : 'Not applicable to this resource.'}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sensitivity check</dt>
                <dd className="mt-1">{explore.data.contextualCheck.detail}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">Policy: {explore.data.policyCode}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
