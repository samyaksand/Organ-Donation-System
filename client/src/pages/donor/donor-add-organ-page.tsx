import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Info, Plus } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FormField } from '@/components/common/form-field';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/features/auth/hooks';
import { HospitalSelect } from '@/features/hospitals/components/hospital-select';
import { OrganTypeSelect } from '@/features/organs/components/organ-type-select';
import { useCreateMyOrgan } from '@/features/organs/hooks';
import { type DonorOrganValues, donorOrganSchema } from '@/features/organs/schema';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { handleFormError, nullIfEmpty } from '@/lib/forms';

export function DonorAddOrganPage() {
  useDocumentTitle('Add organ');
  const navigate = useNavigate();
  const { data: user } = useSession();
  const create = useCreateMyOrgan();
  const form = useForm<DonorOrganValues>({
    resolver: zodResolver(donorOrganSchema),
    defaultValues: { organType: undefined, otherOrganName: '', hospitalId: '', procurementDate: '', notes: '' },
  });
  const { errors } = form.formState;
  const organType = useWatch({ control: form.control, name: 'organType' });
  const withdrawn = user?.donor?.status === 'WITHDRAWN';

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        organType: v.organType,
        otherOrganName: v.organType === 'OTHER' ? nullIfEmpty(v.otherOrganName) : null,
        hospitalId: v.hospitalId,
        procurementDate: v.procurementDate,
        notes: nullIfEmpty(v.notes),
      });
      toast.success('Organ registered', { description: 'It will show as pending until the hospital verifies it.' });
      navigate('/donor/organs');
    } catch (err) {
      handleFormError(err, form.setError, 'Could not register organ');
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/donor/organs">
          <ArrowLeft aria-hidden="true" /> Back to my organs
        </Link>
      </Button>
      <PageHeader title="Add an organ" description="Record an organ you are pledging and the hospital responsible for it." />

      {withdrawn ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Registration withdrawn</AlertTitle>
          <AlertDescription>You cannot add organs while your registration is withdrawn. Contact an administrator to reactivate it.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <Alert variant="info">
                <Info aria-hidden="true" />
                <AlertDescription>
                  New records start as <strong className="font-medium text-foreground">Pending review</strong>. They appear in public
                  availability only after an administrator verifies them, and never with your name.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Organ type" error={errors.organType?.message} required>
                  {(p) => (
                    <Controller
                      control={form.control}
                      name="organType"
                      render={({ field }) => (
                        <OrganTypeSelect control={p} value={field.value} onChange={(v) => field.onChange(v || undefined)} />
                      )}
                    />
                  )}
                </FormField>
                {organType === 'OTHER' && (
                  <FormField label="Organ or tissue name" error={errors.otherOrganName?.message} required>
                    {(p) => <Input {...p} placeholder="e.g. Skin tissue" {...form.register('otherOrganName')} />}
                  </FormField>
                )}
              </div>

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
                <FormField label="Procurement date" error={errors.procurementDate?.message} required hint="Scheduled or actual date.">
                  {(p) => <Input {...p} type="date" {...form.register('procurementDate')} />}
                </FormField>
              </div>

              <FormField label="Notes" error={errors.notes?.message} optional>
                {(p) => <Textarea {...p} rows={3} placeholder="Anything the hospital should know" {...form.register('notes')} />}
              </FormField>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" asChild>
                  <Link to="/donor/organs">Cancel</Link>
                </Button>
                <Button type="submit" loading={create.isPending}>
                  {!create.isPending && <Plus aria-hidden="true" />}
                  Register organ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
