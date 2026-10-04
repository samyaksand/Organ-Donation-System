import * as React from 'react';
import { cn } from '@/lib/utils';

interface Option<V extends string> {
  value: V;
  label: string;
}

interface RadioGroupProps<V extends string> {
  legend: string;
  name: string;
  options: readonly Option<V>[];
  value: V | undefined;
  onChange: (value: V) => void;
  error?: string;
  required?: boolean;
}

/** Native radio inputs in a fieldset: full keyboard support (arrow keys) and screen-reader grouping for free. */
export function RadioGroup<V extends string>({ legend, name, options, value, onChange, error, required }: RadioGroupProps<V>) {
  const id = React.useId();
  const errorId = `${id}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error) || undefined}>
      <legend className="mb-1.5 flex items-center gap-1 text-sm font-medium">
        {legend}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1',
                checked ? 'border-primary bg-primary/5 text-foreground' : 'border-input hover:bg-muted',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 accent-[hsl(var(--primary))] focus:outline-none"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
