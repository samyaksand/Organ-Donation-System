import { CalendarRange, X } from 'lucide-react';
import { useId, useState } from 'react';
import { FilterSelect } from '@/components/common/filter-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AnalyticsWindowParams } from '@/types/api';

const WINDOW_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'Current month' },
  { value: 'lastMonth', label: 'Previous month' },
];

interface PeriodSelectorProps {
  value: AnalyticsWindowParams;
  onChange: (value: AnalyticsWindowParams) => void;
}

/**
 * Global analytics period control. Emits either `{ window }` or `{ from, to }` - never both,
 * matching the server's analyticsWindowQuery contract (server/src/schemas/analytics.schema.ts).
 * No popover/date-picker library: a plain inline row, consistent with the rest of the app's
 * restrained form controls.
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const isCustom = Boolean(value.from && value.to);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [from, setFrom] = useState(value.from ?? '');
  const [to, setTo] = useState(value.to ?? '');
  const fromId = useId();
  const toId = useId();

  const applyCustom = () => {
    if (from && to) onChange({ from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!showCustom && (
        <FilterSelect
          label="Analytics period"
          allLabel="Last 30 days"
          value={value.window ?? ''}
          onChange={(v) => onChange({ window: (v || '30d') as AnalyticsWindowParams['window'] })}
          options={WINDOW_OPTIONS}
        />
      )}
      {showCustom ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={fromId} className="text-xs">
              From
            </Label>
            <Input id={fromId} type="date" className="h-9 w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={toId} className="text-xs">
              To
            </Label>
            <Input id={toId} type="date" className="h-9 w-36" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" disabled={!from || !to} onClick={applyCustom}>
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowCustom(false);
              onChange({ window: '30d' });
            }}
            aria-label="Cancel custom range"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowCustom(true)}>
          <CalendarRange aria-hidden="true" /> Custom range
        </Button>
      )}
    </div>
  );
}
