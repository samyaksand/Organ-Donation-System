import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { OrganIconTile } from '@/components/common/organ-icon';
import { SectionHeading } from '@/components/common/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AskOrganFlowSection } from '@/features/public/components/ask-organflow-section';
import { HospitalCard } from '@/features/hospitals/components/hospital-card';
import { useHospitals } from '@/features/hospitals/hooks';
import { useAvailabilitySummary } from '@/features/organs/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ORGAN_TYPE_DESCRIPTIONS, ORGAN_TYPE_LABELS } from '@/lib/domain';
import { formatNumber } from '@/lib/format';
import { ORGAN_TYPES } from '@/types/api';

/** Smooth, in-page scroll to an element id - no route change, no reload. Falls back silently if
 * the target isn't mounted yet (shouldn't happen since every anchor target lives on this page). */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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

const features = [
  { icon: Search, title: 'Organ Availability Explorer', body: 'Filter by organ type, city and availability to find organs recorded at participating hospitals. No account needed.', public: true },
  { icon: Building2, title: 'Hospital Network', body: 'Browse participating hospitals, their contact details and what they currently have available.', public: true },
  { icon: BarChart3, title: 'Public Analytics', body: 'Live, aggregate figures on organ availability, hospital activity and trends - open to everyone.', public: true },
  { icon: Sparkles, title: 'Investigation', body: 'Ask an operational question in plain language and get an evidence-backed, AI-assisted answer grounded in real figures.', public: true },
  { icon: ClipboardList, title: 'Hospital Organ Request Workflow', body: 'Hospitals request specific organs; administrators review, approve or decline, and the organ record updates automatically.' },
  { icon: LayoutDashboard, title: 'Operational Dashboards', body: 'Management-grade KPIs, trends and deterministic bottleneck detection for administrators.' },
  { icon: UserPlus, title: 'Donor Management', body: 'Register as a donor and manage your personal, medical and next-of-kin details at any time.' },
  { icon: HeartPulse, title: 'Organ Management', body: 'Add the organs you are pledging and the hospital responsible for them, and keep them up to date.' },
  { icon: LogOut, title: 'Withdrawal Workflow', body: 'Submit a request to withdraw your registration and track its status until it is reviewed.' },
  { icon: UserCog, title: 'Role-Based Security', body: 'Donor, admin and super-admin roles each see exactly the data and actions appropriate to them.' },
];

function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="container scroll-mt-20 py-16">
      <SectionHeading
        id="features-heading"
        eyebrow="Features"
        title="What you can do with OrganFlow"
        description="Explore, analyze and investigate without an account - or register to manage your own donor pledge."
      />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <li key={feature.title}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {feature.public && <Badge variant="success">No account needed</Badge>}
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AcademicOriginBanner() {
  return (
    <div className="border-b bg-primary/5">
      <div className="container flex flex-col items-center gap-2 py-3 text-center sm:flex-row sm:justify-center sm:gap-3 sm:py-2.5">
        <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 text-sm text-foreground/80">
          Originally developed as a CS254 Database Systems (DBMS) project under Prof. Annappa, later
          extended by applying concepts learned in CS418 (Information Security) taught by Prof. Mahendra
          at NIT Karnataka, India
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b bg-card">
      <div className="container grid items-center gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
        <div className="space-y-6">
          <Badge variant="default" className="gap-1.5">
            <HeartHandshake aria-hidden="true" /> Organ Donation Operations & Intelligence Platform
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.75rem]">
            OrganFlow
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Explore organ availability, hospitals and operational activity through structured data and analytics - then ask
            an AI-assisted investigation tool to explain what it means. No account needed to look around.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/organs">
                <Search aria-hidden="true" /> Explore Available Organs
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/analytics">
                <BarChart3 aria-hidden="true" /> Explore Analytics
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/investigate">
                <Sparkles aria-hidden="true" /> Investigate
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/pledge">
                <HeartHandshake aria-hidden="true" /> Pledge to Donate
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => scrollToId('ask-organflow')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Ask OrganFlow <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Donor identities are never shown in public searches.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold">Everything you can explore right now</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { icon: Search, text: 'Search live organ availability by type, city and hospital' },
              { icon: Building2, text: 'Browse the participating hospital network' },
              { icon: BarChart3, text: 'View public analytics on availability and trends' },
              { icon: Sparkles, text: 'Ask the investigation tool an operational question' },
              { icon: HeartHandshake, text: 'Make a quick, no-account pledge to donate' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            Want a full donor account instead?{' '}
            <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Register as a donor
            </Link>{' '}
            or{' '}
            <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              sign in
            </Link>
            .
          </div>
        </Card>
      </div>
    </section>
  );
}

const flowSteps = ['Explore', 'Analyze', 'Investigate', 'Understand', 'Act'];

function OperationalFlow() {
  return (
    <section aria-label="Explore, analyze, investigate, understand, act" className="border-b bg-muted/30 py-12">
      <div className="container">
        <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 text-base font-semibold sm:text-lg">
          {flowSteps.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className={i === 0 ? 'text-primary' : 'text-foreground'}>{step}</span>
              {i < flowSteps.length - 1 && <ArrowRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
          Operational data becomes analytics, analytics becomes an investigation, and every investigation ends with a
          human administrator making the final decision.
        </p>
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
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/organs">
                  Search availability <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/analytics">
                  <BarChart3 aria-hidden="true" /> Explore analytics
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

function BackToTop() {
  return (
    <div className="container flex justify-center pb-12">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Back to top <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function LandingPage() {
  useDocumentTitle();
  return (
    <>
      <AcademicOriginBanner />
      <Hero />
      <OperationalFlow />
      <HowItWorks />
      <Features />
      <OrganTypes />
      <AvailabilityOverview />
      <Hospitals />
      <AskOrganFlowSection />
      <DonorCta />
      <BackToTop />
    </>
  );
}
