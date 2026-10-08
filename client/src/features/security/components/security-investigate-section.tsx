import { Loader2, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PublicFindingCard } from '@/features/public/components/public-finding-card';
import { usePublicInvestigate } from '@/features/public/hooks';
import { formatDateTime, pluralize } from '@/lib/format';

const EXAMPLE_QUESTIONS = [
  'Why are organ requests being delayed?',
  'Are there repeated access-control violations?',
  "Why is another donor's medical information protected?",
  'What security policies block unauthorized access?',
];

/**
 * AI Investigation, embedded on the public Privacy & Security page. Reuses the exact same
 * public investigation API/component/hook as the standalone /investigate page - the same AI
 * Security Gateway and policy engine apply from either entry point (see
 * server/src/security/aiGateway.ts). A security-analysis question here is correctly BLOCKED for
 * a signed-out/non-admin visitor, demonstrating the gateway's own boundary rather than a special
 * case for this page.
 */
export function SecurityInvestigateSection() {
  const [question, setQuestion] = useState('');
  const investigate = usePublicInvestigate();

  const run = (q?: string) => investigate.mutate(q || undefined);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
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
              placeholder="Ask how access control or the AI gateway works…"
              maxLength={500}
              aria-label="Security question"
            />
            <Button type="submit" variant="outline" loading={investigate.isPending} disabled={!question.trim()}>
              <Search aria-hidden="true" /> <span className="hidden sm:inline">Ask</span>
            </Button>
          </form>
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
        </CardContent>
      </Card>

      {investigate.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Screening and investigating&hellip;</p>
          </CardContent>
        </Card>
      )}

      {investigate.data?.blocked && !investigate.isPending && (
        <EmptyState icon={ShieldAlert} title="This question was not investigated" description={investigate.data.message} />
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
            <EmptyState icon={Search} title="Insufficient evidence" description="The public investigation tool only has access to aggregate public data and cannot answer this." />
          ) : investigate.data.findings.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing notable to report" description="Current figures don't show anything unusual." />
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
  );
}
