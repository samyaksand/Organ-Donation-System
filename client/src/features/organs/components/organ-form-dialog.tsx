import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HospitalSelect } from '@/features/hospitals/components/hospital-select';
import { ORGAN_STATUS_LABELS } from '@/lib/domain';
import { handleFormError, nullIfEmpty } from '@/lib/forms';
import { type AdminOrgan, ORGAN_STATUSES } from '@/types/api';
import { useAdminCreateOrgan, useAdminUpdateOrgan } from '../hooks';
import { type AdminOrganValues, adminOrganSchema } from '../schema';
import { OrganTypeSelect } from './organ-type-select';

interface OrganFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing record. */
  organ?: AdminOrgan | null;
  /** Pre-fills the Donor ID when creating (e.g. from Donor management). */
  initialDonorCode?: string;
}

function toValues(organ: AdminOrgan | null | undefined, donorCode = ''): AdminOrganValues {
  return organ
    ? {
        donorCode: organ.donor.donorCode,
        organType: organ.organType,
        otherOrganName: organ.otherOrganName ?? '',
        hospitalId: organ.hospital.id,
        procurementDate: organ.procurementDate,
        notes: organ.notes ?? '',
        status: organ.status,
      }
    : {
        donorCode,
        organType: undefined as unknown as AdminOrganValues['organType'],
        otherOrganName: '',
        hospitalId: '',
        procurementDate: '',
        notes: '',
        status: 'AVAILABLE',
      };
}

/** Admin create/edit organ (legacy "Add Organ to Waiting list" form, now with a hospital FK and status). */
export function OrganFormDialog({ open, onOpenChange, organ, initialDonorCode }: OrganFormDialogProps) {
  const editing = Boolean(organ);
  const create = useAdminCreateOrgan();
  const update = useAdminUpdateOrgan();
  const form = useForm<AdminOrganValues>({ resolver: zodResolver(adminOrganSchema), defaultValues: toValues(organ, initialDonorCode) });
  const { errors } = form.formState;
  const organType = useWatch({ control: form.control, name: 'organType' });

  useEffect(() => {
    if (open) form.reset(toValues(organ, initialDonorCode));
  }, [open, organ, initialDonorCode, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    const common = {
      organType: v.organType,
      otherOrganName: v.organType === 'OTHER' ? nullIfEmpty(v.otherOrganName) : null,
      hospitalId: v.hospitalId,
      procurementDate: v.procurementDate,
      notes: nullIfEmpty(v.notes),
      status: v.status,
    };
    try {
      if (organ) {
        await update.mutateAsync({ id: organ.id, payload: common });
        toast.success('Organ record updated');
      } else {
        await create.mutateAsync({ ...common, donorCode: v.donorCode.trim().toUpperCase() });
        toast.success('Organ record added');
      }
      onOpenChange(false);
    } catch (err) {
      handleFormError(err, form.setError, editing ? 'Could not update organ' : 'Could not add organ');
    }
  });

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit organ record' : 'Add organ record'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Donor ${organ?.donor.name} (${organ?.donor.donorCode})`
              : 'Record an organ for a registered donor and the hospital holding it.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {!editing && (
            <FormField label="Donor ID" error={errors.donorCode?.message} required hint="Shown on the donor's account, e.g. DN4K7Q2M.">
              {(p) => <Input {...p} className="font-mono uppercase" autoComplete="off" {...form.register('donorCode')} />}
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Organ type" error={errors.organType?.message} required>
              {(p) => (
                <Controller
                  control={form.control}
                  name="organType"
                  render={({ field }) => <OrganTypeSelect control={p} value={field.value} onChange={(v) => field.onChange(v || undefined)} />}
                />
              )}
            </FormField>
            <FormField label="Status" error={errors.status?.message} required>
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
                        {ORGAN_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {ORGAN_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
          </div>
          {organType === 'OTHER' && (
            <FormField label="Organ or tissue name" error={errors.otherOrganName?.message} required>
              {(p) => <Input {...p} {...form.register('otherOrganName')} />}
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Hospital" error={errors.hospitalId?.message} required>
              {(p) => (
                <Controller
                  control={form.control}
                  name="hospitalId"
                  render={({ field }) => <HospitalSelect control={p} value={field.value} onChange={(v) => field.onChange(v ?? '')} />}
                />
              )}
            </FormField>
            <FormField label="Procurement date" error={errors.procurementDate?.message} required>
              {(p) => <Input {...p} type="date" {...form.register('procurementDate')} />}
            </FormField>
          </div>
          <FormField label="Notes" error={errors.notes?.message} optional>
            {(p) => <Textarea {...p} rows={3} {...form.register('notes')} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Add organ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
