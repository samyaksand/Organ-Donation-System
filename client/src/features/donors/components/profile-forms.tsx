import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { RadioGroup } from '@/components/common/radio-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChangePassword } from '@/features/auth/hooks';
import { HospitalSelect } from '@/features/hospitals/components/hospital-select';
import { GENDER_LABELS } from '@/lib/domain';
import { todayIso } from '@/lib/format';
import { dateRule, handleFormError, nullIfEmpty, optionalRule, passwordRule, phoneRule, requiredRule } from '@/lib/forms';
import { type DonorProfile, GENDERS } from '@/types/api';
import { useUpdateMyNextOfKin, useUpdateMyProfile } from '../hooks';

function FormActions({ dirty, saving, label = 'Save changes', onReset }: { dirty: boolean; saving: boolean; label?: string; onReset: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={onReset} disabled={!dirty || saving}>
        Discard
      </Button>
      <Button type="submit" loading={saving} disabled={!dirty}>
        {!saving && <Save aria-hidden="true" />}
        {label}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- Personal

const personalSchema = z.object({
  firstName: requiredRule('First name', 60),
  lastName: requiredRule('Last name', 60),
  gender: z.enum(GENDERS),
  dateOfBirth: dateRule('Date of birth').refine((v) => v < todayIso(), 'Date of birth must be in the past'),
  phone: phoneRule,
  address: requiredRule('Address', 200),
  city: requiredRule('City', 80),
  state: requiredRule('State', 80),
});
type PersonalValues = z.infer<typeof personalSchema>;

export function PersonalInfoForm({ profile }: { profile: DonorProfile }) {
  const update = useUpdateMyProfile();
  const defaults: PersonalValues = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
  };
  const form = useForm<PersonalValues>({ resolver: zodResolver(personalSchema), values: defaults });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
      toast.success('Personal details updated');
    } catch (err) {
      handleFormError(err, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message} required>
          {(p) => <Input {...p} autoComplete="given-name" {...form.register('firstName')} />}
        </FormField>
        <FormField label="Last name" error={errors.lastName?.message} required>
          {(p) => <Input {...p} autoComplete="family-name" {...form.register('lastName')} />}
        </FormField>
        <FormField label="Date of birth" error={errors.dateOfBirth?.message} required>
          {(p) => <Input {...p} type="date" max={todayIso()} {...form.register('dateOfBirth')} />}
        </FormField>
        <FormField label="Phone number" error={errors.phone?.message} required>
          {(p) => <Input {...p} type="tel" autoComplete="tel" {...form.register('phone')} />}
        </FormField>
      </div>
      <Controller
        control={form.control}
        name="gender"
        render={({ field }) => (
          <RadioGroup
            legend="Gender"
            name={field.name}
            options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))}
            value={field.value}
            onChange={field.onChange}
            error={errors.gender?.message}
            required
          />
        )}
      />
      <FormField label="Street address" error={errors.address?.message} required>
        {(p) => <Input {...p} autoComplete="street-address" {...form.register('address')} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" error={errors.city?.message} required>
          {(p) => <Input {...p} autoComplete="address-level2" {...form.register('city')} />}
        </FormField>
        <FormField label="State" error={errors.state?.message} required>
          {(p) => <Input {...p} autoComplete="address-level1" {...form.register('state')} />}
        </FormField>
      </div>
      <FormActions dirty={isDirty} saving={update.isPending} onReset={() => form.reset(defaults)} />
    </form>
  );
}

// ---------------------------------------------------------------- Medical & care

const medicalSchema = z.object({
  hospitalId: z.string().nullable(),
  personalDoctor: optionalRule(120),
  medicalConditions: optionalRule(2000),
});
type MedicalValues = z.infer<typeof medicalSchema>;

export function MedicalInfoForm({ profile }: { profile: DonorProfile }) {
  const update = useUpdateMyProfile();
  const defaults: MedicalValues = {
    hospitalId: profile.hospital?.id ?? null,
    personalDoctor: profile.personalDoctor ?? '',
    medicalConditions: profile.medicalConditions ?? '',
  };
  const form = useForm<MedicalValues>({ resolver: zodResolver(medicalSchema), values: defaults });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        hospitalId: values.hospitalId,
        personalDoctor: nullIfEmpty(values.personalDoctor),
        medicalConditions: nullIfEmpty(values.medicalConditions),
      });
      toast.success('Medical and care details updated');
    } catch (err) {
      handleFormError(err, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Registered hospital" error={errors.hospitalId?.message} optional>
          {(p) => (
            <Controller
              control={form.control}
              name="hospitalId"
              render={({ field }) => <HospitalSelect control={p} value={field.value} onChange={field.onChange} allowNone />}
            />
          )}
        </FormField>
        <FormField label="Personal doctor" error={errors.personalDoctor?.message} optional>
          {(p) => <Input {...p} placeholder="Dr. …" {...form.register('personalDoctor')} />}
        </FormField>
      </div>
      <FormField
        label="Medical conditions / ailments"
        error={errors.medicalConditions?.message}
        optional
        hint="Ongoing conditions, past illnesses, allergies or medications relevant to donation."
      >
        {(p) => <Textarea {...p} rows={5} {...form.register('medicalConditions')} />}
      </FormField>
      <FormActions dirty={isDirty} saving={update.isPending} onReset={() => form.reset(defaults)} />
    </form>
  );
}

// ---------------------------------------------------------------- Next of kin

const kinSchema = z.object({
  name: requiredRule('Name', 120),
  phone: phoneRule,
  relationship: optionalRule(60),
});
type KinValues = z.infer<typeof kinSchema>;

export function NextOfKinForm({ profile }: { profile: DonorProfile }) {
  const update = useUpdateMyNextOfKin();
  const defaults: KinValues = {
    name: profile.nextOfKin?.name ?? '',
    phone: profile.nextOfKin?.phone ?? '',
    relationship: profile.nextOfKin?.relationship ?? '',
  };
  const form = useForm<KinValues>({ resolver: zodResolver(kinSchema), values: defaults });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ name: values.name, phone: values.phone, relationship: nullIfEmpty(values.relationship) });
      toast.success('Next of kin updated');
    } catch (err) {
      handleFormError(err, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" error={errors.name?.message} required>
          {(p) => <Input {...p} {...form.register('name')} />}
        </FormField>
        <FormField label="Phone number" error={errors.phone?.message} required>
          {(p) => <Input {...p} type="tel" {...form.register('phone')} />}
        </FormField>
        <FormField label="Relationship" error={errors.relationship?.message} optional>
          {(p) => <Input {...p} placeholder="e.g. Spouse, Parent" {...form.register('relationship')} />}
        </FormField>
      </div>
      <FormActions dirty={isDirty} saving={update.isPending} onReset={() => form.reset(defaults)} />
    </form>
  );
}

// ---------------------------------------------------------------- Password

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'Choose a different password' });
type PasswordValues = z.infer<typeof passwordSchema>;

const emptyPasswords: PasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const change = useChangePassword();
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: emptyPasswords });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
      form.reset(emptyPasswords);
      toast.success('Password changed');
    } catch (err) {
      handleFormError(err, form.setError, 'Could not change password');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-5">
      <FormField label="Current password" error={errors.currentPassword?.message} required>
        {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register('currentPassword')} />}
      </FormField>
      <FormField label="New password" error={errors.newPassword?.message} required hint="At least 8 characters, with a letter and a number.">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('newPassword')} />}
      </FormField>
      <FormField label="Confirm new password" error={errors.confirmPassword?.message} required>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('confirmPassword')} />}
      </FormField>
      <FormActions dirty={isDirty} saving={change.isPending} label="Change password" onReset={() => form.reset(emptyPasswords)} />
    </form>
  );
}
