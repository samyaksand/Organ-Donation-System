import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
  'aria-required'?: boolean;
}

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
}

/**
 * Label + control + hint + error, wired together for screen readers
 * (`aria-invalid`, `aria-describedby`). The error is announced via role="alert".
 */
export function FormField({ label, error, hint, required, optional, className, children }: FormFieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <legend className="text-base font-semibold text-foreground">{title}</legend>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}
