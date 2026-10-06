import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * "Explain" affordance for a KPI: what it means, how it's calculated, and (optionally) what
 * data/period it's drawn from. Every management figure that isn't self-explanatory from its
 * label alone should carry one of these, per the MIS transparency requirement.
 */
export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-muted-foreground hover:text-foreground" aria-label={`About ${label}`}>
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}
