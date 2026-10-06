import { Check } from 'lucide-react';
import { OrganIcon } from '@/components/common/organ-icon';
import { ORGAN_TYPE_LABELS, ORGAN_TYPE_DESCRIPTIONS } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { ORGAN_TYPES, type OrganType } from '@/types/api';

/** Selectable organ cards for the pledge flow's "donation preference" step. */
export function OrganPreferencePicker({ value, onChange }: { value: OrganType | ''; onChange: (value: OrganType) => void }) {
  return (
    <div role="radiogroup" aria-label="Donation preference" className="grid gap-3 sm:grid-cols-2">
      {ORGAN_TYPES.map((type) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
            )}
          >
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
              <OrganIcon type={type} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{ORGAN_TYPE_LABELS[type]}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ORGAN_TYPE_DESCRIPTIONS[type]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
