import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { SearchInput } from '@/components/common/search-input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { HospitalCard } from '@/features/hospitals/components/hospital-card';
import { useCities, useHospitals } from '@/features/hospitals/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';

const ALL = '__all__';

export function HospitalDirectoryPage() {
  useDocumentTitle('Hospital directory');
  const { values, page, setFilter, setPage } = useListParams(['q', 'city'] as const);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounce(search, 300);
  useEffect(() => {
    if (debounced !== values.q) setFilter('q', debounced.trim());
  }, [debounced, values.q, setFilter]);

  const cities = useCities();
  const query = useHospitals({ q: values.q || undefined, city: values.city || undefined, page, pageSize: 12 });

  return (
    <div className="container space-y-8 py-10">
      <PageHeader
        title="Hospital directory"
        description="Participating hospitals, their contact details and the organs currently recorded as available."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          label="Search hospitals"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, city or address"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select value={values.city || ALL} onValueChange={(v) => setFilter('city', v === ALL ? '' : v)}>
          <SelectTrigger className="sm:w-56" aria-label="Filter by city">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cities</SelectItem>
            {cities.data && cities.data.length > 0 && <SelectSeparator />}
            {cities.data?.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section aria-label="Hospitals" aria-busy={query.isFetching} className="space-y-6">
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : query.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading hospitals">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-60 rounded-xl" />
            ))}
          </div>
        ) : query.data.items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={values.q || values.city ? 'No hospitals match your search' : 'No hospitals registered yet'}
            description={
              values.q || values.city
                ? 'Try a different name or city.'
                : 'Hospitals appear here once an administrator adds them.'
            }
          />
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.items.map((h) => (
                <li key={h.id}>
                  <HospitalCard hospital={h} />
                </li>
              ))}
            </ul>
            <Pagination meta={query.data.meta} onPageChange={setPage} label="hospitals" />
          </>
        )}
      </section>
    </div>
  );
}
