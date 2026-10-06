import { AlertTriangle, ArrowRight, CircleAlert, Info, OctagonAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgentFinding } from '@/types/api';

const severityConfig: Record<AgentFinding['severity'], { label: string; variant: 'destructive' | 'warning' | 'info' | 'muted'; icon: LucideIcon; border: string }> = {
  high: { label: 'Critical', variant: 'destructive', icon: OctagonAlert, border: 'border-l-destructive' },
  medium: { label: 'Warning', variant: 'warning', icon: AlertTriangle, border: 'border-l-warning' },
  low: { label: 'Attention', variant: 'info', icon: CircleAlert, border: 'border-l-info' },
  info: { label: 'Informational', variant: 'muted', icon: Info, border: 'border-l-border' },
};

/**
 * Public-facing finding card: same Fact/Interpretation/Recommendation separation as the admin
 * FindingCard, but never shows internal tool names (just "View supporting data" to the public
 * Analytics page) and uses plain-language severity labels instead of HIGH/MEDIUM/LOW/INFO.
 */
export function PublicFindingCard({ finding }: { finding: AgentFinding }) {
  const { label, variant, icon: Icon, border } = severityConfig[finding.severity];

  return (
    <Card className={cn('border-l-4', border)}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <Badge variant={variant} className="mb-1">
              {label}
            </Badge>
            <h3 className="font-semibold leading-tight">{finding.title}</h3>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facts</p>
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

        <Button size="sm" variant="outline" asChild>
          <Link to="/analytics">
            View supporting data <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
