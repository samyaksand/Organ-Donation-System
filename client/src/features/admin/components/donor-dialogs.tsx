import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { DONOR_STATUS_LABELS } from '@/lib/domain';
import { emailRule, handleFormError, nullIfEmpty, optionalRule, passwordRule, phoneRule } from '@/lib/forms';
import { DONOR_STATUSES, type DonorListItem } from '@/types/api';
import { useAdminDonor, useAdminResetDonorPassword, useAdminUpdateDonor } from '../hooks';

// ---------------------------------------------------------------- Edit donor

const editSchema = z.object({
  email: emailRule,
  phone: phoneRule,
  medicalConditions: optionalRule(2000),
  status: z.enum(DONOR_STATUSES),
});
type EditValues = z.infer<typeof editSchema>;

/** Legacy admin "Update Record" (Email / Ailments / Contact), now a validated form per donor. */
export function EditDonorDialog({ donor, onOpenChange }: { donor: DonorListItem | null; onOpenChange: (open: boolean) => void }) {
  const detail = useAdminDonor(donor?.id ?? null);
  const update = useAdminUpdateDonor();
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: detail.data
      ? {
          email: detail.data.email,
          phone: detail.data.phone,
          medicalConditions: detail.data.medicalConditions ?? '',
          status: detail.data.status,
        }
      : undefined,
  });
  const { errors, isDirty, dirtyFields } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    if (!donor) return;
    // Only send fields the admin actually changed.
    const payload = {
      ...(dirtyFields.email ? { email: v.email } : {}),
      ...(dirtyFields.phone ? { phone: v.phone } : {}),
      ...(dirtyFields.medicalConditions ? { medicalConditions: nullIfEmpty(v.medicalConditions) } : {}),
      ...(dirtyFields.status ? { status: v.status } : {}),
    };
    try {
      await update.mutateAsync({ id: donor.id, payload });
      toast.success(`Updated ${donor.name}`);
      onOpenChange(false);
    } catch (err) {
      handleFormError(err, form.setError, 'Could not update donor');
    }
  });

  return (
    <Dialog open={Boolean(donor)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit donor</DialogTitle>
          <DialogDescription>
            {donor?.name} · <span className="font-mono">{donor?.donorCode}</span>
          </DialogDescription>
        </DialogHeader>
        {detail.isPending ? (
          <div className="space-y-3" role="status" aria-label="Loading donor">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <FormField label="Email" error={errors.email?.message} required hint="The donor signs in with this email.">
              {(p) => <Input {...p} type="email" {...form.register('email')} />}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Phone" error={errors.phone?.message} required>
                {(p) => <Input {...p} type="tel" {...form.register('phone')} />}
              </FormField>
              <FormField label="Account status" error={errors.status?.message} required>
                {(p) => (
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={p.id} aria-describedby={p['aria-describedby']}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DONOR_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {DONOR_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </FormField>
            </div>
            <FormField label="Medical conditions / ailments" error={errors.medicalConditions?.message} optional>
              {(p) => <Textarea {...p} rows={4} {...form.register('medicalConditions')} />}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={update.isPending} disabled={!isDirty}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Reset password

const resetSchema = z
  .object({ newPassword: passwordRule, confirmPassword: z.string().min(1, 'Confirm the password') })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type ResetValues = z.infer<typeof resetSchema>;

/** Legacy admin "update Password" option - now hashed server-side via a dedicated endpoint. */
export function ResetPasswordDialog({ donor, onOpenChange }: { donor: DonorListItem | null; onOpenChange: (open: boolean) => void }) {
  const reset = useAdminResetDonorPassword();
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: '', confirmPassword: '' } });
  const { errors } = form.formState;

  const close = (open: boolean) => {
    if (!open) form.reset();
    onOpenChange(open);
  };

  const onSubmit = form.handleSubmit(async (v) => {
    if (!donor) return;
    try {
      await reset.mutateAsync({ id: donor.id, newPassword: v.newPassword });
      toast.success(`Password reset for ${donor.name}`, { description: 'Share the new password with the donor securely.' });
      close(false);
    } catch (err) {
      handleFormError(err, form.setError, 'Could not reset password');
    }
  });

  return (
    <Dialog open={Boolean(donor)} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new sign-in password for {donor?.name}. Their current password stops working immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="New password" error={errors.newPassword?.message} required hint="At least 8 characters, with a letter and a number.">
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('newPassword')} />}
          </FormField>
          <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('confirmPassword')} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={reset.isPending}>
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
