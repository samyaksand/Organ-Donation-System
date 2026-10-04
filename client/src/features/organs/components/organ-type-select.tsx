import { OrganIcon } from '@/components/common/organ-icon';
import type { FieldControlProps } from '@/components/common/form-field';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';
import { ORGAN_TYPES, type OrganType } from '@/types/api';

const ALL = '__all__';

interface OrganTypeSelectProps {
  value: OrganType | '' | undefined;
  onChange: (value: OrganType | '') => void;
  control?: Partial<FieldControlProps>;
  /** Filter mode: adds an "All organ types" option mapping to ''. */
  includeAll?: boolean;
  ariaLabel?: string;
}

export function OrganTypeSelect({ value, onChange, control, includeAll, ariaLabel }: OrganTypeSelectProps) {
  return (
    <Select value={value ? value : includeAll ? ALL : ''} onValueChange={(v) => onChange(v === ALL ? '' : (v as OrganType))}>
      <SelectTrigger
        id={control?.id}
        aria-label={ariaLabel}
        aria-invalid={control?.['aria-invalid']}
        aria-describedby={control?.['aria-describedby']}
      >
        <SelectValue placeholder="Select organ type" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <>
            <SelectItem value={ALL}>All organ types</SelectItem>
            <SelectSeparator />
          </>
        )}
        {ORGAN_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            <span className="flex items-center gap-2">
              <OrganIcon type={t} className="text-muted-foreground" />
              {ORGAN_TYPE_LABELS[t]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
