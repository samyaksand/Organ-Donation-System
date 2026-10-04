import type * as React from 'react';
import { ErrorState } from '@/components/common/error-state';
import { OrganIconTile } from '@/components/common/organ-icon';
import { DonorStatusBadge, OrganStatusBadge, WithdrawalStatusBadge } from '@/components/common/status-badges';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { GENDER_LABELS, organLabel } from '@/lib/domain';
import { formatDate, formatDateTime } from '@/lib/format';
import { useAdminDonor } from '../hooks';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** Read-only donor record for administrators (the legacy admin page had no way to view a donor at all). */
export function DonorDetailSheet({ donorId, onOpenChange }: { donorId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data, isPending, isError, error, refetch } = useAdminDonor(donorId);

  return (
    <Sheet open={Boolean(donorId)} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0">
        <SheetHeader>
          <SheetTitle>{data ? `${data.firstName} ${data.lastName}` : 'Donor details'}</SheetTitle>
          <SheetDescription>{data ? `Donor ID ${data.donorCode}` : 'Loading donor record'}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-5 pb-8">
          {isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isPending ? (
            <div className="space-y-3" role="status" aria-label="Loading donor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <DonorStatusBadge status={data.status} />
                <span className="text-xs text-muted-foreground">Registered {formatDate(data.createdAt)}</span>
                {data.lastLoginAt && <span className="text-xs text-muted-foreground">· Last sign-in {formatDateTime(data.lastLoginAt)}</span>}
              </div>

              <Section title="Contact">
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Email">{data.email}</Field>
                  <Field label="Phone">{data.phone}</Field>
                  <Field label="Address">
                    {data.address}, {data.city}, {data.state}
                  </Field>
                  <Field label="Gender / DOB">
                    {GENDER_LABELS[data.gender]} · {formatDate(data.dateOfBirth)}
                  </Field>
                </dl>
              </Section>
              <Separator />
              <Section title="Medical & care">
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Registered hospital">{data.hospital ? `${data.hospital.name}, ${data.hospital.city}` : '—'}</Field>
                  <Field label="Personal doctor">{data.personalDoctor ?? '—'}</Field>
                  <div className="col-span-2">
                    <Field label="Medical conditions">
                      <span className="whitespace-pre-line">{data.medicalConditions ?? 'None recorded'}</span>
                    </Field>
                  </div>
                </dl>
              </Section>
              <Separator />
              <Section title="Next of kin">
                {data.nextOfKin ? (
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Name">{data.nextOfKin.name}</Field>
                    <Field label="Phone">{data.nextOfKin.phone}</Field>
                    <Field label="Relationship">{data.nextOfKin.relationship ?? '—'}</Field>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided.</p>
                )}
              </Section>
              <Separator />
              <Section title={`Organs (${data.organs.length})`}>
                {data.organs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No organs registered.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.organs.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <OrganIconTile type={o.organType} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{organLabel(o)}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {o.hospital.name} · {formatDate(o.procurementDate)}
                            </p>
                          </div>
                        </div>
                        <OrganStatusBadge status={o.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Separator />
              <Section title="Withdrawal requests">
                {data.withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.withdrawals.map((w) => (
                      <li key={w.id} className="space-y-1 rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <WithdrawalStatusBadge status={w.status} />
                          <span className="text-xs text-muted-foreground">{formatDateTime(w.createdAt)}</span>
                        </div>
                        <p className="text-sm">{w.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
