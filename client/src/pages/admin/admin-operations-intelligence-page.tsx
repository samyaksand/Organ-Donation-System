import { Loader2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FindingCard } from '@/features/agent/components/finding-card';
import { useInvestigate } from '@/features/agent/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatDateTime, pluralize } from '@/lib/format';

const EXAMPLE_QUESTIONS = [
  'Why are organ requests taking longer this month?',
  'Which hospitals need attention?',
  'Where is organ availability concentrated?',
  'What changed compared with last month?',
];

/**
 * Operations Intelligence: a controlled, read-only investigation tool, not a chatbot. One
 * question in, one structured, evidence-backed assessment out - see
 * server/src/agent/agent.ts for the DETECT -> INVESTIGATE -> EVIDENCE -> RECOMMEND loop this
 * triggers. The agent never approves, declines or modifies anything; every recommendation here
 * requires a human to act on it elsewhere in the console.
 */
export function AdminOperationsIntelligencePage() {
  useDocumentTitle('Operations Intelligence');
  const [question, setQuestion] = useState('');
  const investigate = useInvestigate();

  const run = (q?: string) => {
    investigate.mutate(q || undefined);
  };

  const unavailable = investigate.isError && investigate.error instanceof ApiError && investigate.error.status === 503;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Intelligence"
        description="A read-only investigation agent that reasons over OrganFlow's own deterministic analytics. It never approves, declines, or modifies any record - every recommendation is for an administrator to act on."
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="sm:w-auto" onClick={() => run()} loading={investigate.isPending && !question}>
              <Sparkles aria-hidden="true" /> Analyze operations
            </Button>
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(question);
              }}
            >
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask an operational question…"
                maxLength={500}
                aria-label="Operational question"
              />
              <Button type="submit" variant="outline" loading={investigate.isPending && Boolean(question)} disabled={!question.trim()}>
                <Search aria-hidden="true" /> <span className="hidden sm:inline">Investigate</span>
              </Button>
            </form>
          </div>
          {!investigate.data && !investigate.isPending && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  onClick={() => {
                    setQuestion(q);
                    run(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {investigate.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Investigating…</p>
              <p className="text-sm text-muted-foreground">Gathering evidence from donor, organ, hospital and request records.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {investigate.isError && !investigate.isPending && (
        <EmptyState
          icon={Sparkles}
          title={unavailable ? 'Operations Intelligence is not configured' : 'The investigation could not be completed'}
          description={
            unavailable
              ? 'This deployment has no GEMINI_API_KEY set, so the agent cannot run. Ask an administrator to configure one.'
              : 'Please try again, or rephrase the question.'
          }
          action={
            !unavailable && (
              <Button variant="outline" onClick={() => run(question || undefined)}>
                Try again
              </Button>
            )
          }
        />
      )}

      {investigate.data && !investigate.isPending && (
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(investigate.data.generatedAt)}</p>
              </div>
              <p>{investigate.data.summary}</p>
              <p className="text-xs text-muted-foreground">
                Data used: {investigate.data.toolsUsed.length > 0 ? investigate.data.toolsUsed.join(', ') : 'none'}
              </p>
            </CardContent>
          </Card>

          {investigate.data.insufficientEvidence ? (
            <EmptyState
              icon={Search}
              title="Insufficient evidence to determine the cause"
              description="The agent could not find enough evidence in the available data to draw a reliable conclusion for this question. Try a more specific question, or a different time period."
            />
          ) : investigate.data.findings.length === 0 ? (
            <EmptyState icon={Sparkles} title="No operational issues identified" description="Current metrics are within normal thresholds." />
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {pluralize(investigate.data.findings.length, 'issue')} identified
              </p>
              {investigate.data.findings.map((finding, i) => (
                <FindingCard key={i} finding={finding} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
