import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { handleFormError, nullIfEmpty, optionalRule, phoneRule, requiredRule } from '@/lib/forms';
import type { HospitalSummary } from '@/types/api';
import { useCreateHospital, useUpdateHospital } from '../hooks';

const schema = z.object({
  name: requiredRule('Hospital name', 160),
  city: requiredRule('City', 80),
  state: optionalRule(80),
  address: requiredRule('Address', 250),
  phone: phoneRule,
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
});
type Values = z.infer<typeof schema>;

function toValues(h?: HospitalSummary | null): Values {
  return { name: h?.name ?? '', city: h?.city ?? '', state: h?.state ?? '', address: h?.address ?? '', phone: h?.phone ?? '', email: h?.email ?? '' };
}

export function HospitalFormDialog({
  open,
  onOpenChange,
  hospital,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital?: HospitalSummary | null;
}) {
  const create = useCreateHospital();
  const update = useUpdateHospital();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(hospital) });
  const { errors } = form.formState;
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (open) form.reset(toValues(hospital));
  }, [open, hospital, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    const payload = { name: v.name, city: v.city, state: nullIfEmpty(v.state), address: v.address, phone: v.phone, email: nullIfEmpty(v.email) };
    try {
      if (hospital) {
        await update.mutateAsync({ id: hospital.id, payload });
        toast.success('Hospital updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Hospital added');
      }
      onOpenChange(false);
    } catch (err) {
      handleFormError(err, form.setError, 'Could not save hospital');
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{hospital ? 'Edit hospital' : 'Add hospital'}</DialogTitle>
          <DialogDescription>These details are shown publicly in the hospital directory and availability search.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Hospital name" error={errors.name?.message} required>
            {(p) => <Input {...p} {...form.register('name')} />}
          </FormField>
          <FormField label="Street address" error={errors.address?.message} required>
            {(p) => <Input {...p} {...form.register('address')} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City" error={errors.city?.message} required>
              {(p) => <Input {...p} {...form.register('city')} />}
            </FormField>
            <FormField label="State" error={errors.state?.message} optional>
              {(p) => <Input {...p} {...form.register('state')} />}
            </FormField>
            <FormField label="Contact number" error={errors.phone?.message} required>
              {(p) => <Input {...p} type="tel" {...form.register('phone')} />}
            </FormField>
            <FormField label="Email" error={errors.email?.message} optional>
              {(p) => <Input {...p} type="email" {...form.register('email')} />}
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {hospital ? 'Save changes' : 'Add hospital'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
