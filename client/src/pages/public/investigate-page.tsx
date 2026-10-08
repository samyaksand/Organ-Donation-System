import { Loader2, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { DataStatusBanner } from '@/components/common/data-status-banner';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PublicFindingCard } from '@/features/public/components/public-finding-card';
import { usePublicInvestigate } from '@/features/public/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatDateTime, pluralize } from '@/lib/format';

const EXAMPLE_QUESTIONS = [
  'Which organ types have the highest availability?',
  'Which hospitals currently have available organs?',
  'Where is organ availability concentrated?',
  'What changed recently?',
];

/**
 * Public Investigate: an extension of public Analytics, not a general chatbot. One question in,
 * one structured, evidence-backed answer out, using ONLY the restricted public toolset (see
 * server/src/agent/publicTools.ts) - no donor identity, no individual records, no
 * administrative data is ever reachable from here. A `?q=` query param pre-fills and runs a
 * question when arriving from an "Ask about this" link elsewhere on the public site.
 */
export function InvestigatePage() {
  useDocumentTitle('Investigate');
  const [searchParams] = useSearchParams();
  const [question, setQuestion] = useState(searchParams.get('q') ?? '');
  const investigate = usePublicInvestigate();
  const ranInitialQuestion = useRef(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !ranInitialQuestion.current) {
      ranInitialQuestion.current = true;
      investigate.mutate(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = (q?: string) => investigate.mutate(q || undefined);

  const unavailable = investigate.isError && investigate.error instanceof ApiError && investigate.error.status === 503;

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <PageHeader
        title="Investigate"
        description="Ask a question about organ availability, hospitals, or trends. An AI assistant reasons over OrganFlow's own live figures and shows its evidence - it never invents a number."
      />
      <DataStatusBanner />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="sm:w-auto" onClick={() => run()} loading={investigate.isPending && !question}>
              <Sparkles aria-hidden="true" /> Summarize availability
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
                placeholder="Ask about organ availability, hospitals or trends…"
                maxLength={500}
                aria-label="Public operational question"
              />
              <Button type="submit" variant="outline" loading={investigate.isPending && Boolean(question)} disabled={!question.trim()}>
                <Search aria-hidden="true" /> <span className="hidden sm:inline">Ask</span>
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
              <p className="text-sm text-muted-foreground">Gathering evidence from live organ and hospital availability figures.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {investigate.isError && !investigate.isPending && (
        <EmptyState
          icon={Sparkles}
          title={unavailable ? 'Investigation is temporarily unavailable' : 'The investigation could not be completed'}
          description="Please try again in a moment, or explore the figures directly on the Analytics page."
          action={
            <Button variant="outline" onClick={() => run(question || undefined)}>
              Try again
            </Button>
          }
        />
      )}

      {investigate.data?.blocked && !investigate.isPending && (
        <EmptyState
          icon={ShieldAlert}
          title="This question was not investigated"
          description={investigate.data.message}
        />
      )}

      {investigate.data && !investigate.data.blocked && !investigate.isPending && (
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(investigate.data.generatedAt)}</p>
              </div>
              <p>{investigate.data.summary}</p>
            </CardContent>
          </Card>

          {investigate.data.insufficientEvidence ? (
            <EmptyState
              icon={Search}
              title="Insufficient evidence to determine this"
              description="The public investigation tool only has access to aggregate organ and hospital availability data - it cannot answer questions about donor identity, individual records, or administrative detail. Try a question about availability, hospitals, or trends instead."
            />
          ) : investigate.data.findings.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing notable to report" description="Current availability figures don't show anything unusual." />
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">{pluralize(investigate.data.findings.length, 'finding')}</p>
              {investigate.data.findings.map((finding, i) => (
                <PublicFindingCard key={i} finding={finding} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
