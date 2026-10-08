import { Info, ShieldCheck, ShieldX } from 'lucide-react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useExplorePolicy } from '@/features/security/hooks';
import type { SecurityResource, SecurityResourceAction } from '@/types/api';

/**
 * A small "Why can I see this?" affordance for sensitive donor pages - connects the actual UI to
 * the real policy engine (POST /public/security/explore -> server/src/security/policyEngine.ts),
 * never a hardcoded explanation. Uses the same Tooltip primitive as InfoTooltip
 * (components/common/info-tooltip.tsx) rather than a new Popover dependency - a short policy
 * explanation fits a hover/focus tooltip just as well. `ownership` defaults to "own" (the normal
 * case: a donor viewing their own page).
 */
export function WhyCanIAccessThis({
  resource,
  action = 'VIEW',
  ownership = 'own',
}: {
  resource: SecurityResource;
  action?: SecurityResourceAction;
  ownership?: 'own' | 'other';
}) {
  const explore = useExplorePolicy();

  useEffect(() => {
    explore.mutate({ role: 'DONOR', resource, action, ownership });
    // Re-evaluate only when the resource/action/ownership identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, action, ownership]);

  const result = explore.data;
  const allow = result?.decision === 'ALLOW';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" /> Why can I see this?
        </button>
      </TooltipTrigger>
      <TooltipContent className="w-72 space-y-2 p-3 text-left text-sm">
        {!result ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              {allow ? (
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              ) : (
                <ShieldX className="h-4 w-4 text-destructive" aria-hidden="true" />
              )}
              <span className="font-semibold">{allow ? 'Access restricted to you' : 'Access restricted'}</span>
              <Badge variant="outline" className="ml-auto">
                {result.classification}
              </Badge>
            </div>
            <dl className="space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Decision</dt>
                <dd className="font-medium">{result.decision}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Policy</dt>
                <dd className="text-right font-medium">{allow ? 'Donor ownership' : 'Ownership requirement not met'}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground">{result.reason}</p>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
