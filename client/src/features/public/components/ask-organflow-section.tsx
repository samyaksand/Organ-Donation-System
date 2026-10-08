import { Loader2, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateTime, pluralize } from '@/lib/format';
import { PublicFindingCard } from './public-finding-card';
import { usePublicInvestigate } from '../hooks';

const SUGGESTED_QUESTIONS = [
  'Which hospitals currently have available organs?',
  'Which organ types have the highest availability?',
  'Which organ types have the lowest availability?',
  'Summarize current organ availability.',
  'What trends are visible in organ availability?',
];

/**
 * "Ask OrganFlow" - the homepage entry point into the EXISTING public investigation pipeline
 * (usePublicInvestigate -> POST /public/agent/investigate -> AI Security Gateway -> PUBLIC_TOOLS
 * -> provider failover -> PublicFindingCard). This is not a second AI backend or a chat
 * history - one question in, one evidence-backed result out, same as the standalone
 * /investigate page. Never invents a number, never exposes donor information, and remains
 * behind the same gateway/toolset boundary regardless of entry point.
 */
export function AskOrganFlowSection() {
  const [question, setQuestion] = useState('');
  const investigate = usePublicInvestigate();

  const run = (q?: string) => investigate.mutate(q || undefined);

  return (
    <section aria-labelledby="ask-organflow-heading" className="container space-y-8 py-16">
      <SectionHeading
        id="ask-organflow-heading"
        eyebrow="AI-assisted investigation"
        title="Ask OrganFlow"
        description="Explore organ availability, hospitals, and operational trends using OrganFlow's data."
      />

      <div className="mx-auto max-w-3xl space-y-5">
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                run(question);
              }}
            >
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask OrganFlow about organs, hospitals, or trends…"
                maxLength={500}
                aria-label="Ask OrganFlow a question"
              />
              <Button type="submit" loading={investigate.isPending} disabled={!question.trim()}>
                <Search aria-hidden="true" /> Ask
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
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
          </CardContent>
        </Card>

        {investigate.isPending && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Investigating…</p>
            </CardContent>
          </Card>
        )}

        {investigate.data?.blocked && !investigate.isPending && (
          <EmptyState icon={ShieldAlert} title="This question was not investigated" description={investigate.data.message} />
        )}

        {investigate.isError && !investigate.isPending && (
          <EmptyState
            icon={Sparkles}
            title="The investigation could not be completed"
            description="Please try again in a moment."
            action={
              <Button variant="outline" onClick={() => run(question || undefined)}>
                Try again
              </Button>
            }
          />
        )}

        {investigate.data && !investigate.data.blocked && !investigate.isPending && (
          <div className="space-y-4">
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
              <EmptyState icon={Search} title="Insufficient evidence" description="The public investigation tool only has access to aggregate organ and hospital availability data." />
            ) : investigate.data.findings.length === 0 ? (
              <EmptyState icon={Sparkles} title="Nothing notable to report" description="Current availability figures don't show anything unusual." />
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{pluralize(investigate.data.findings.length, 'finding')}</p>
                {investigate.data.findings.map((finding, i) => (
                  <PublicFindingCard key={i} finding={finding} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
