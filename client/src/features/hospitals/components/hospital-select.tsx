import type { FieldControlProps } from '@/components/common/form-field';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useHospitalOptions } from '../hooks';

const NONE = '__none__';

interface HospitalSelectProps {
  control: FieldControlProps;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Adds a "No preference" option that maps to null. */
  allowNone?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function HospitalSelect({ control, value, onChange, allowNone, placeholder = 'Select a hospital', disabled }: HospitalSelectProps) {
  const { data, isPending, isError, refetch } = useHospitalOptions();

  if (isPending) return <Skeleton className="h-10 w-full" />;

  if (isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load hospitals.{' '}
        <button type="button" className="underline underline-offset-2" onClick={() => void refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const noHospitals = data.length === 0;

  return (
    <Select
      value={value ?? (allowNone ? NONE : '')}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled || (noHospitals && !allowNone)}
    >
      <SelectTrigger
        id={control.id}
        aria-invalid={control['aria-invalid']}
        aria-describedby={control['aria-describedby']}
        aria-required={control['aria-required']}
      >
        <SelectValue placeholder={noHospitals ? 'No hospitals registered yet' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <>
            <SelectItem value={NONE}>No preference</SelectItem>
            {!noHospitals && <SelectSeparator />}
          </>
        )}
        {data.map((h) => (
          <SelectItem key={h.id} value={h.id}>
            {h.name} — {h.city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
