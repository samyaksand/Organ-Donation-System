import { ArrowLeft, ArrowRight, CheckCircle2, Download, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { pledgesApi } from '@/api/pledges';
import { DataStatusBanner } from '@/components/common/data-status-banner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrganPreferencePicker } from '@/features/pledges/components/organ-preference-picker';
import { useCreatePledge } from '@/features/pledges/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';
import { emailRule } from '@/lib/forms';
import type { OrganType, Pledge } from '@/types/api';

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = { 1: 'Your details', 2: 'Donation preference', 3: 'Confirm' };

export function PledgePage() {
  useDocumentTitle('Pledge to donate');
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [organPreference, setOrganPreference] = useState<OrganType | ''>('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Pledge | null>(null);
  const create = useCreatePledge();

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Full name is required';
    const parsedEmail = emailRule.safeParse(email);
    if (!parsedEmail.success) next.email = parsedEmail.error.issues[0]?.message ?? 'Enter a valid email address';
    if (!city.trim()) next.city = 'City is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !organPreference) {
      setErrors({ organPreference: 'Select a donation preference to continue' });
      return;
    }
    setErrors({});
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };
  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const submit = async () => {
    if (!organPreference || !consent) return;
    try {
      const pledge = await create.mutateAsync({ fullName: fullName.trim(), email: email.trim(), city: city.trim(), organPreference, consent: true });
      setResult(pledge);
    } catch (err) {
      toast.error('Could not submit your pledge', { description: errorMessage(err) });
    }
  };

  if (result) return <PledgeSuccess pledge={result} />;

  return (
    <div className="container max-w-xl space-y-6 py-10">
      <PageHeader title="Pledge to donate" description="A quick, no-account way to record your intent to donate. Takes about a minute." />
      <DataStatusBanner />

      <ol className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground" aria-label="Progress">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : s}
            </span>
            <span className={s === step ? 'text-foreground' : undefined}>{STEP_LABELS[s]}</span>
            {i < 2 && <span className="h-px w-6 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-8 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Your details</h2>
                <p className="text-sm text-muted-foreground">How should we identify your pledge?</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="pledge-name">Full name</Label>
                  <Input id="pledge-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                  {errors.fullName && (
                    <p className="text-xs font-medium text-destructive" role="alert">
                      {errors.fullName}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pledge-email">Email</Label>
                  <Input id="pledge-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  {errors.email && (
                    <p className="text-xs font-medium text-destructive" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pledge-city">City</Label>
                  <Input id="pledge-city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                  {errors.city && (
                    <p className="text-xs font-medium text-destructive" role="alert">
                      {errors.city}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Donation preference</h2>
                <p className="text-sm text-muted-foreground">What would you like to pledge to donate?</p>
              </div>
              <OrganPreferencePicker value={organPreference} onChange={setOrganPreference} />
              {errors.organPreference && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errors.organPreference}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Review your pledge</h2>
                <p className="text-sm text-muted-foreground">Check your details before submitting.</p>
              </div>
              <dl className="space-y-3 rounded-lg border bg-muted/30 p-5 text-sm">
                {[
                  ['Name', fullName],
                  ['Email', email],
                  ['City', city],
                  ['Donation preference', organPreference ? ORGAN_TYPE_LABELS[organPreference] : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span>
                  I consent to recording this pledge on the OrganFlow demonstration platform. I understand this is not an official
                  donor registration and does not create a medical or legal obligation.
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-6">
            <Button variant="ghost" onClick={goBack} disabled={step === 1}>
              <ArrowLeft aria-hidden="true" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={goNext}>
                Continue <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={() => void submit()} loading={create.isPending} disabled={!consent}>
                <HeartHandshake aria-hidden="true" /> Submit pledge
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PledgeSuccess({ pledge }: { pledge: Pledge }) {
  return (
    <div className="container max-w-xl py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Pledge recorded</h1>
      <p className="mt-2 text-muted-foreground">
        Thank you, {pledge.fullName}. Your pledge to donate {ORGAN_TYPE_LABELS[pledge.organPreference].toLowerCase()} has been recorded.
      </p>
      <Card className="mx-auto mt-8 max-w-sm">
        <CardContent className="space-y-1 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference ID</p>
          <p className="font-mono text-lg font-semibold">{pledge.referenceId}</p>
        </CardContent>
      </Card>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <a href={pledgesApi.certificateUrl(pledge.referenceId)} target="_blank" rel="noreferrer">
            <Download aria-hidden="true" /> Download certificate
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/investigate">
            <Sparkles aria-hidden="true" /> Explore Investigate
          </a>
        </Button>
      </div>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        This is a demo-platform pledge, not an official government donor registration.
      </p>
    </div>
  );
}
