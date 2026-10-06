import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { HospitalSelect } from '@/features/hospitals/components/hospital-select';
import { handleFormError, nullIfEmpty } from '@/lib/forms';
import { useCreateOrganRequest } from '../hooks';
import { type CreateOrganRequestValues, createOrganRequestSchema } from '../schema';
import { OrganPicker } from './organ-picker';

interface OrganRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the hospital and organ (e.g. opened from an organ's row actions). */
  initial?: { hospitalId?: string; organId?: string };
}

const defaultValues = (initial?: OrganRequestFormDialogProps['initial']): CreateOrganRequestValues => ({
  hospitalId: initial?.hospitalId ?? '',
  organId: initial?.organId ?? '',
  notes: '',
});

/** Admin records a hospital's request for one specific, currently available organ. */
export function OrganRequestFormDialog({ open, onOpenChange, initial }: OrganRequestFormDialogProps) {
  const create = useCreateOrganRequest();
  const form = useForm<CreateOrganRequestValues>({ resolver: zodResolver(createOrganRequestSchema), defaultValues: defaultValues(initial) });
  const { errors } = form.formState;
  const hospitalId = useWatch({ control: form.control, name: 'hospitalId' });

  useEffect(() => {
    if (open) form.reset(defaultValues(initial));
  }, [open, initial, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({ hospitalId: v.hospitalId, organId: v.organId, notes: nullIfEmpty(v.notes) });
      toast.success('Organ request submitted');
      onOpenChange(false);
    } catch (err) {
      handleFormError(err, form.setError, 'Could not submit request');
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New organ request</DialogTitle>
          <DialogDescription>Record a hospital's request for a specific, currently available organ.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Requesting hospital" error={errors.hospitalId?.message} required>
            {(p) => (
              <Controller
                control={form.control}
                name="hospitalId"
                render={({ field }) => (
                  <HospitalSelect
                    control={p}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v ?? '');
                      form.setValue('organId', '');
                    }}
                  />
                )}
              />
            )}
          </FormField>
          <FormField
            label="Organ"
            error={errors.organId?.message}
            required
            hint={hospitalId ? undefined : 'Only organs currently marked available can be requested.'}
          >
            {(p) => (
              <Controller
                control={form.control}
                name="organId"
                render={({ field }) => <OrganPicker control={p} hospitalId={hospitalId} value={field.value} onChange={field.onChange} />}
              />
            )}
          </FormField>
          <FormField label="Notes" error={errors.notes?.message} optional hint="Operational context for this request, e.g. urgency or ward.">
            {(p) => <Textarea {...p} rows={3} {...form.register('notes')} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
