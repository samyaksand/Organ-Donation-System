import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField, FormSection } from '@/components/common/form-field';
import { RadioGroup } from '@/components/common/radio-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { HospitalSelect } from '@/features/hospitals/components/hospital-select';
import { GENDER_LABELS } from '@/lib/domain';
import { todayIso } from '@/lib/format';
import { dateRule, emailRule, handleFormError, nullIfEmpty, optionalRule, passwordRule, phoneRule, requiredRule } from '@/lib/forms';
import { GENDERS } from '@/types/api';
import { useRegister } from '../hooks';

const schema = z
  .object({
    firstName: requiredRule('First name', 60),
    lastName: requiredRule('Last name', 60),
    gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Select a gender' }) }),
    dateOfBirth: dateRule('Date of birth').refine((v) => v < todayIso(), 'Date of birth must be in the past'),
    phone: phoneRule,
    address: requiredRule('Address', 200),
    city: requiredRule('City', 80),
    state: requiredRule('State', 80),
    hospitalId: z.string().nullable(),
    personalDoctor: optionalRule(120),
    medicalConditions: optionalRule(2000),
    nextOfKin: z.object({
      name: requiredRule('Next of kin name', 120),
      phone: phoneRule,
      relationship: optionalRule(60),
    }),
    email: emailRule,
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    consent: z.literal(true, { errorMap: () => ({ message: 'You must confirm to register' }) }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

type Values = z.input<typeof schema>;

const genderOptions = GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }));

export function RegisterForm() {
  const register = useRegister();
  const navigate = useNavigate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: undefined,
      dateOfBirth: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      hospitalId: null,
      personalDoctor: '',
      medicalConditions: '',
      nextOfKin: { name: '', phone: '', relationship: '' },
      email: '',
      password: '',
      confirmPassword: '',
      consent: false as unknown as true,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const user = await register.mutateAsync({
        email: v.email,
        password: v.password,
        confirmPassword: v.confirmPassword,
        firstName: v.firstName,
        lastName: v.lastName,
        gender: v.gender,
        dateOfBirth: v.dateOfBirth,
        phone: v.phone,
        address: v.address,
        city: v.city,
        state: v.state,
        hospitalId: v.hospitalId,
        personalDoctor: nullIfEmpty(v.personalDoctor),
        medicalConditions: nullIfEmpty(v.medicalConditions),
        nextOfKin: { name: v.nextOfKin.name, phone: v.nextOfKin.phone, relationship: nullIfEmpty(v.nextOfKin.relationship) },
      });
      toast.success('Registration complete', { description: `Your Donor ID is ${user.donor?.donorCode ?? ''}.` });
      navigate('/donor', { replace: true });
    } catch (err) {
      handleFormError(err, form.setError, 'Registration failed');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <FormSection title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" error={errors.firstName?.message} required>
            {(p) => <Input {...p} autoComplete="given-name" {...form.register('firstName')} />}
          </FormField>
          <FormField label="Last name" error={errors.lastName?.message} required>
            {(p) => <Input {...p} autoComplete="family-name" {...form.register('lastName')} />}
          </FormField>
          <FormField label="Date of birth" error={errors.dateOfBirth?.message} required>
            {(p) => <Input {...p} type="date" max={todayIso()} autoComplete="bday" {...form.register('dateOfBirth')} />}
          </FormField>
          <FormField label="Phone number" error={errors.phone?.message} required hint="Include the country code, e.g. +91 98765 43210">
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
              options={genderOptions}
              value={field.value}
              onChange={field.onChange}
              error={errors.gender?.message}
              required
            />
          )}
        />
      </FormSection>

      <Separator />

      <FormSection title="Address">
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
      </FormSection>

      <Separator />

      <FormSection title="Medical & care" description="Helps hospitals contact the right people. You can update this later.">
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
          hint="List any ongoing conditions, past illnesses or medications."
        >
          {(p) => <Textarea {...p} rows={3} {...form.register('medicalConditions')} />}
        </FormField>
      </FormSection>

      <Separator />

      <FormSection title="Next of kin" description="The person we may contact about your donation decision.">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Full name" error={errors.nextOfKin?.name?.message} required>
            {(p) => <Input {...p} {...form.register('nextOfKin.name')} />}
          </FormField>
          <FormField label="Phone number" error={errors.nextOfKin?.phone?.message} required>
            {(p) => <Input {...p} type="tel" {...form.register('nextOfKin.phone')} />}
          </FormField>
          <FormField label="Relationship" error={errors.nextOfKin?.relationship?.message} optional>
            {(p) => <Input {...p} placeholder="e.g. Spouse" {...form.register('nextOfKin.relationship')} />}
          </FormField>
        </div>
      </FormSection>

      <Separator />

      <FormSection title="Account">
        <FormField label="Email" error={errors.email?.message} required hint="You will sign in with this email.">
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Password" error={errors.password?.message} required hint="At least 8 characters, with a letter and a number.">
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('password')} />}
          </FormField>
          <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('confirmPassword')} />}
          </FormField>
        </div>
      </FormSection>

      <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            {...form.register('consent')}
          />
          <span className="text-muted-foreground">
            I confirm the information above is accurate and I wish to register as an organ donor. I understand I can update my
            details or request to withdraw at any time from my donor account.
          </span>
        </label>
        {errors.consent && (
          <p id="consent-error" role="alert" className="text-xs font-medium text-destructive">
            {errors.consent.message}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
        <Button type="submit" size="lg" className="w-full sm:w-auto" loading={register.isPending}>
          {!register.isPending && <UserPlus aria-hidden="true" />}
          {register.isPending ? 'Creating account…' : 'Register as a donor'}
        </Button>
      </div>
    </form>
  );
}
