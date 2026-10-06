import type { FieldControlProps } from '@/components/common/form-field';
import { OrganIcon } from '@/components/common/organ-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrgans } from '@/features/organs/hooks';
import { organLabel } from '@/lib/domain';

interface OrganPickerProps {
  control: FieldControlProps;
  hospitalId: string;
  value: string;
  onChange: (value: string) => void;
  /** Keep the currently-selected organ selectable even if it's no longer AVAILABLE (edit case). */
  excludeId?: string;
}

/**
 * Lists AVAILABLE organs at the chosen hospital. An organ request targets one specific organ
 * record (never an organ type in the abstract), so this intentionally only shows organs that
 * can actually be requested right now.
 */
export function OrganPicker({ control, hospitalId, value, onChange }: OrganPickerProps) {
  const query = useAdminOrgans({ hospitalId: hospitalId || undefined, status: 'AVAILABLE', page: 1, pageSize: 100 });

  if (!hospitalId) {
    return (
      <Select disabled value="">
        <SelectTrigger id={control.id}>
          <SelectValue placeholder="Select a hospital first" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  if (query.isPending) return <Skeleton className="h-10 w-full" />;

  const organs = query.data?.items ?? [];

  return (
    <Select value={value} onValueChange={onChange} disabled={organs.length === 0}>
      <SelectTrigger id={control.id} aria-invalid={control['aria-invalid']} aria-describedby={control['aria-describedby']}>
        <SelectValue placeholder={organs.length === 0 ? 'No available organs at this hospital' : 'Select an organ'} />
      </SelectTrigger>
      <SelectContent>
        {organs.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            <span className="flex items-center gap-2">
              <OrganIcon type={o.organType} className="text-muted-foreground" />
              {organLabel(o)} · <span className="font-mono text-xs">{o.donor.donorCode}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
