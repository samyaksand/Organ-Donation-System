import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, FileText, Info, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { FormField } from '@/components/common/form-field';
import { PageHeader } from '@/components/common/page-header';
import { WithdrawalStatusBadge } from '@/components/common/status-badges';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMyProfile } from '@/features/donors/hooks';
import { useCreateWithdrawal, useMyWithdrawals } from '@/features/withdrawals/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatDateTime } from '@/lib/format';
import { handleFormError } from '@/lib/forms';

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Please give a short reason (at least 10 characters)')
    .max(1000, 'Reason must be at most 1000 characters'),
});
type Values = z.infer<typeof schema>;

function WithdrawalForm() {
  const create = useCreateWithdrawal();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });
  const { errors } = form.formState;
  const reason = useWatch({ control: form.control, name: 'reason' }) ?? '';

  const submit = async () => {
    try {
      await create.mutateAsync(form.getValues('reason').trim());
      setConfirmOpen(false);
      form.reset({ reason: '' });
      toast.success('Withdrawal request sent', { description: 'An administrator will review it.' });
    } catch (err) {
      setConfirmOpen(false);
      handleFormError(err, form.setError, 'Could not send request');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(() => setConfirmOpen(true))} noValidate className="space-y-5">
      <FormField
        label="Reason for withdrawal"
        error={errors.reason?.message}
        required
        hint={`${reason.trim().length}/1000 characters. Shared only with administrators.`}
      >
        {(p) => <Textarea {...p} rows={5} {...form.register('reason')} />}
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" variant="destructive">
          <LogOut aria-hidden="true" /> Request withdrawal
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send withdrawal request?"
        description={
          <div className="space-y-2">
            <p>An administrator will review your request. If it is approved, your registration is marked as withdrawn and your organ records are no longer listed as available.</p>
            <p>You can only have one request awaiting review at a time.</p>
          </div>
        }
        confirmLabel="Send request"
        destructive
        loading={create.isPending}
        onConfirm={submit}
      />
    </form>
  );
}

/** Legacy "Withdraw organ donation application" (deletionreason table), now with a tracked status. */
export function DonorWithdrawalPage() {
  useDocumentTitle('Withdrawal');
  const profile = useMyProfile();
  const withdrawals = useMyWithdrawals();

  const loading = profile.isPending || withdrawals.isPending;
  const error = profile.error ?? withdrawals.error;
  const pending = withdrawals.data?.find((w) => w.status === 'PENDING');
  const withdrawn = profile.data?.status === 'WITHDRAWN';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Withdraw registration"
        description="You can withdraw your organ donation registration at any time. Requests are reviewed by an administrator."
      />

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void profile.refetch();
            void withdrawals.refetch();
          }}
        />
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          {withdrawn ? (
            <Alert variant="info">
              <Info aria-hidden="true" />
              <AlertTitle>Your registration is withdrawn</AlertTitle>
              <AlertDescription>Contact an administrator if you want to reactivate your registration.</AlertDescription>
            </Alert>
          ) : pending ? (
            <Alert variant="warning">
              <Clock aria-hidden="true" />
              <AlertTitle>Request awaiting review</AlertTitle>
              <AlertDescription>
                You submitted a withdrawal request on {formatDateTime(pending.createdAt)}. You will see the outcome here once an
                administrator reviews it.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>New withdrawal request</CardTitle>
                <CardDescription>Tell us briefly why you want to withdraw. This helps administrators process your request.</CardDescription>
              </CardHeader>
              <CardContent>
                <WithdrawalForm />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Request history</CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.data && withdrawals.data.length > 0 ? (
                <ul className="divide-y">
                  {withdrawals.data.map((w) => (
                    <li key={w.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <WithdrawalStatusBadge status={w.status} />
                        <span className="text-xs text-muted-foreground">Submitted {formatDateTime(w.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-line text-sm">{w.reason}</p>
                      {w.reviewedAt && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed {formatDateTime(w.reviewedAt)}
                          {w.adminNote ? ` — “${w.adminNote}”` : ''}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FileText} title="No withdrawal requests" description="Requests you submit will appear here with their status." />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
