import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  Hospital,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { OrganIconTile } from '@/components/common/organ-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HospitalCard } from '@/features/hospitals/components/hospital-card';
import { useHospitals } from '@/features/hospitals/hooks';
import { useAvailabilitySummary } from '@/features/organs/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ORGAN_TYPE_DESCRIPTIONS, ORGAN_TYPE_LABELS } from '@/lib/domain';
import { formatNumber } from '@/lib/format';
import { ORGAN_TYPES } from '@/types/api';

const steps = [
  {
    icon: UserPlus,
    title: 'Register as a donor',
    body: 'Create your donor account with your personal, medical and next-of-kin details. You receive a Donor ID straight away.',
  },
  {
    icon: Hospital,
    title: 'Record your pledge',
    body: 'Add the organs you are pledging and the hospital that will handle them. You can update your details at any time.',
  },
  {
    icon: ClipboardCheck,
    title: 'Hospital verification',
    body: 'Administrators verify each record and keep its availability status up to date.',
  },
  {
    icon: Search,
    title: 'Availability for care teams',
    body: 'Doctors and families can check which organs are available at which hospitals, without seeing donor identities.',
  },
];

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-2 text-center">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b bg-card">
      <div className="container grid items-center gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
        <div className="space-y-6">
          <Badge variant="default" className="gap-1.5">
            <HeartHandshake aria-hidden="true" /> Multi-organ donor registry
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.75rem]">
            One decision can save several lives. Make yours count.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Register as an organ donor, manage your pledge and next-of-kin details, and help care teams find available organs
            at participating hospitals.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/register">
                <UserPlus aria-hidden="true" /> Become a Donor
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/organs">
                <Search aria-hidden="true" /> Find an Organ
              </Link>
            </Button>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Donor identities are never shown in public searches.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold">What you can do with a donor account</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              'Keep personal, medical and doctor details up to date',
              'Record which organs you pledge and at which hospital',
              'Manage your next-of-kin contact',
              'Track the status of each organ record',
              'Request to withdraw your registration at any time',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in to your account
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="container scroll-mt-20 py-16">
      <SectionHeading id="how-heading" eyebrow="How it works" title="From pledge to availability" />
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Card className="h-full p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">Step {index + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OrganTypes() {
  const summary = useAvailabilitySummary();
  const countFor = (type: string) => summary.data?.byType.find((t) => t.organType === type)?.available;

  return (
    <section aria-labelledby="organs-heading" className="border-y bg-muted/40 py-16">
      <div className="container">
        <SectionHeading
          id="organs-heading"
          eyebrow="Supported organ types"
          title="Kidney, liver, heart and more"
          description="The registry records each organ with an explicit type, so availability can be searched precisely."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ORGAN_TYPES.map((type) => {
            const available = countFor(type);
            return (
              <li key={type}>
                <Link
                  to={`/organs?organType=${type}`}
                  className="group flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <OrganIconTile type={type} />
                    {summary.isPending ? (
                      <Skeleton className="h-5 w-20" />
                    ) : available !== undefined ? (
                      <Badge variant={available > 0 ? 'success' : 'muted'}>{formatNumber(available)} available</Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-4 font-semibold">{ORGAN_TYPE_LABELS[type]}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{ORGAN_TYPE_DESCRIPTIONS[type]}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Check availability <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function AvailabilityOverview() {
  const summary = useAvailabilitySummary();

  return (
    <section aria-labelledby="availability-heading" className="container py-16">
      <SectionHeading
        id="availability-heading"
        eyebrow="Organ availability"
        title="Current availability"
        description="Counts come directly from hospital records in this registry and update as administrators record organs."
      />
      <div className="mx-auto mt-10 max-w-4xl">
        {summary.isError ? (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : summary.isPending ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : summary.data.totalAvailable === 0 ? (
          <EmptyState
            icon={Search}
            title="No organs are recorded as available right now"
            description="Hospitals add organs as they are procured. Check back later or browse the hospital directory."
            action={
              <Button variant="outline" asChild>
                <Link to="/hospitals">Browse hospitals</Link>
              </Button>
            }
          />
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Organs available', value: summary.data.totalAvailable },
                { label: 'Hospitals with availability', value: summary.data.hospitalsWithAvailability },
                { label: 'Participating hospitals', value: summary.data.hospitalCount },
              ].map((stat) => (
                <Card key={stat.label} className="p-5 text-center">
                  <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(stat.value)}</dd>
                </Card>
              ))}
            </dl>
            <div className="mt-6 text-center">
              <Button asChild>
                <Link to="/organs">
                  Search availability <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Hospitals() {
  const hospitals = useHospitals({ page: 1, pageSize: 3 });
  return (
    <section aria-labelledby="hospitals-heading" className="border-t bg-muted/40 py-16">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">Hospitals</p>
            <h2 id="hospitals-heading" className="text-2xl font-semibold sm:text-3xl">
              Participating hospitals
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link to="/hospitals">
              <Building2 aria-hidden="true" /> View directory
            </Link>
          </Button>
        </div>
        <div className="mt-8">
          {hospitals.isError ? (
            <ErrorState error={hospitals.error} onRetry={() => void hospitals.refetch()} />
          ) : hospitals.isPending ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-xl" />
              ))}
            </div>
          ) : hospitals.data.items.length === 0 ? (
            <EmptyState icon={Building2} title="No hospitals registered yet" description="Hospitals appear here once an administrator adds them." />
          ) : (
            <ul className="grid gap-4 md:grid-cols-3">
              {hospitals.data.items.map((h) => (
                <li key={h.id}>
                  <HospitalCard hospital={h} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function DonorCta() {
  return (
    <section aria-labelledby="cta-heading" className="container py-16">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center">
        <div className="max-w-xl space-y-2">
          <h2 id="cta-heading" className="text-2xl font-semibold">
            Ready to register as a donor?
          </h2>
          <p className="text-primary-foreground/85">
            It takes a few minutes. You can review, update or withdraw your registration from your account at any time.
          </p>
        </div>
        <Button size="lg" variant="secondary" asChild>
          <Link to="/register">
            <UserPlus aria-hidden="true" /> Become a Donor
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function LandingPage() {
  useDocumentTitle();
  return (
    <>
      <Hero />
      <HowItWorks />
      <OrganTypes />
      <AvailabilityOverview />
      <Hospitals />
      <DonorCta />
    </>
  );
}
