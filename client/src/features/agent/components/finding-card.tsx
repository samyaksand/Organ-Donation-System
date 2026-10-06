import { AlertTriangle, ArrowRight, CircleAlert, Info, OctagonAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgentFinding } from '@/types/api';
import { findingLink } from '../links';

const severityConfig: Record<AgentFinding['severity'], { label: string; variant: 'destructive' | 'warning' | 'info' | 'muted'; icon: LucideIcon; border: string }> = {
  high: { label: 'HIGH', variant: 'destructive', icon: OctagonAlert, border: 'border-l-destructive' },
  medium: { label: 'MEDIUM', variant: 'warning', icon: AlertTriangle, border: 'border-l-warning' },
  low: { label: 'LOW', variant: 'info', icon: CircleAlert, border: 'border-l-info' },
  info: { label: 'INFO', variant: 'muted', icon: Info, border: 'border-l-border' },
};

/**
 * Renders one investigation finding with FACTS, INTERPRETATION and RECOMMENDATION kept visually
 * distinct - the agent's output contract separates deterministic data from its own reasoning,
 * and the UI must not blur that line back together.
 */
export function FindingCard({ finding }: { finding: AgentFinding }) {
  const { label, variant, icon: Icon, border } = severityConfig[finding.severity];
  const link = findingLink(finding);

  return (
    <Card className={cn('border-l-4', border)}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <Badge variant={variant} className="mb-1">
                {label}
              </Badge>
              <h3 className="font-semibold leading-tight">{finding.title}</h3>
            </div>
          </div>
          {link && (
            <Button size="sm" variant="outline" asChild className="shrink-0">
              <Link to={link.href}>
                {link.label} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {finding.facts.map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interpretation</p>
          <p className="text-sm text-muted-foreground">{finding.interpretation}</p>
        </div>

        <div className="space-y-1 rounded-md bg-muted/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</p>
          <p className="text-sm font-medium">{finding.recommendation}</p>
        </div>

        <p className="text-xs text-muted-foreground">Data used: {finding.evidence.join(', ')}</p>
      </CardContent>
    </Card>
  );
}
