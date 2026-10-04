import { FilterX, SearchX, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Availability } from '@/api/organs';
import { useCities } from '@/features/hospitals/hooks';
import { AvailabilityResultCard } from '@/features/organs/components/availability-result-card';
import { OrganTypeSelect } from '@/features/organs/components/organ-type-select';
import { useOrganAvailability } from '@/features/organs/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { ORGAN_TYPES, type OrganType } from '@/types/api';

const AVAILABILITY_OPTIONS: Array<{ value: Availability; label: string }> = [
  { value: 'AVAILABLE', label: 'Available now' },
  { value: 'UNAVAILABLE', label: 'No longer available' },
  { value: 'ALL', label: 'All records' },
];

function asOrganType(value: string): OrganType | undefined {
  return (ORGAN_TYPES as readonly string[]).includes(value) ? (value as OrganType) : undefined;
}

function asAvailability(value: string): Availability {
  return value === 'UNAVAILABLE' || value === 'ALL' ? value : 'AVAILABLE';
}

/** Public organ availability search (legacy /organavail: organ name + city). */
export function OrganAvailabilityPage() {
  useDocumentTitle('Organ availability');
  const { values, page, setFilter, setPage, reset } = useListParams(['organType', 'city', 'availability'] as const);
  const organType = asOrganType(values.organType);
  const availability = asAvailability(values.availability);

  // Local state keeps typing responsive; the URL updates after a short debounce.
  const [cityInput, setCityInput] = useState(values.city);
  const debouncedCity = useDebounce(cityInput, 350);
  useEffect(() => {
    if (debouncedCity !== values.city) setFilter('city', debouncedCity.trim());
  }, [debouncedCity, values.city, setFilter]);

  const cities = useCities();
  const query = useOrganAvailability({ organType, city: values.city || undefined, availability, page, pageSize: 12 });
  const cityId = useId();
  const availabilityId = useId();
  const typeId = useId();
  const hasFilters = Boolean(organType || values.city || availability !== 'AVAILABLE');

  return (
    <div className="container space-y-8 py-10">
      <PageHeader
        title="Organ availability"
        description="Search organs recorded at participating hospitals by organ type and city. Contact the hospital directly for clinical enquiries."
      />

      <Card className="p-4 sm:p-5">
        <form role="search" aria-label="Filter organ availability" onSubmit={(e) => e.preventDefault()} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={typeId}>Organ type</Label>
            <OrganTypeSelect
              includeAll
              value={organType ?? ''}
              onChange={(v) => setFilter('organType', v)}
              control={{ id: typeId }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={cityId}>City</Label>
            <Input
              id={cityId}
              list={`${cityId}-list`}
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Any city"
              autoComplete="off"
            />
            <datalist id={`${cityId}-list`}>
              {cities.data?.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={availabilityId}>Availability</Label>
            <Select value={availability} onValueChange={(v) => setFilter('availability', v === 'AVAILABLE' ? '' : v)}>
              <SelectTrigger id={availabilityId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCityInput('');
              reset();
            }}
            disabled={!hasFilters}
          >
            <FilterX aria-hidden="true" /> Clear
          </Button>
        </form>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        Donor identities are never shown publicly. Only hospital details and organ status are listed.
      </p>

      <section aria-labelledby="results-heading" aria-busy={query.isFetching} className="space-y-6">
        <h2 id="results-heading" className="sr-only">
          Results
        </h2>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : query.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading results">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : query.data.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={hasFilters ? 'No organs match these filters' : 'No organs are currently available'}
            description={
              hasFilters
                ? 'Try another city or organ type, or include records that are no longer available.'
                : 'Availability is updated by hospital administrators as organs are recorded.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCityInput('');
                    reset();
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.items.map((organ) => (
                <li key={organ.id}>
                  <AvailabilityResultCard organ={organ} />
                </li>
              ))}
            </ul>
            <Pagination meta={query.data.meta} onPageChange={setPage} label="organs" />
          </>
        )}
      </section>
    </div>
  );
}
