import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { type Column, DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { OrganIcon } from '@/components/common/organ-icon';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { RowActions } from '@/components/common/row-actions';
import { SearchInput } from '@/components/common/search-input';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { HospitalFormDialog } from '@/features/hospitals/components/hospital-form-dialog';
import { useDeleteHospital, useHospitals } from '@/features/hospitals/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';
import { pluralize } from '@/lib/format';
import type { HospitalWithAvailability } from '@/types/api';

export function AdminHospitalsPage() {
  useDocumentTitle('Hospital information');
  const { values, page, setFilter, setPage } = useListParams(['q'] as const);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounce(search, 300);
  useEffect(() => {
    if (debounced !== values.q) setFilter('q', debounced.trim());
  }, [debounced, values.q, setFilter]);

  const query = useHospitals({ q: values.q || undefined, page, pageSize: 10 });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HospitalWithAvailability | null>(null);
  const [deleting, setDeleting] = useState<HospitalWithAvailability | null>(null);
  const remove = useDeleteHospital();

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`Deleted ${deleting.name}`);
      setDeleting(null);
    } catch (err) {
      // e.g. 409 when organ records still reference the hospital.
      toast.error('Could not delete hospital', { description: errorMessage(err) });
      setDeleting(null);
    }
  };

  const columns: Column<HospitalWithAvailability>[] = [
    {
      id: 'name',
      header: 'Hospital',
      hideOnMobile: true,
      cell: (h) => (
        <div>
          <p className="font-medium">{h.name}</p>
          <p className="text-xs text-muted-foreground">{h.email ?? 'No email'}</p>
        </div>
      ),
    },
    { id: 'city', header: 'City', cell: (h) => `${h.city}${h.state ? `, ${h.state}` : ''}` },
    { id: 'address', header: 'Address', cell: (h) => <span className="line-clamp-2">{h.address}</span> },
    { id: 'phone', header: 'Contact', cell: (h) => h.phone },
    {
      id: 'available',
      header: 'Available organs',
      cell: (h) =>
        h.availableOrganCount === 0 ? (
          <span className="text-muted-foreground">None</span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {h.availableByType.map((t) => (
              <span key={t.organType} className="inline-flex items-center gap-1 text-xs" title={ORGAN_TYPE_LABELS[t.organType]}>
                <OrganIcon type={t.organType} className="h-3.5 w-3.5 text-muted-foreground" />
                {ORGAN_TYPE_LABELS[t.organType]} {t.count}
              </span>
            ))}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital information"
        description={query.data ? `${pluralize(query.data.meta.total, 'hospital')}. Organs must be linked to one of these hospitals.` : 'Participating hospitals.'}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> Add hospital
          </Button>
        }
      />

      <SearchInput label="Search hospitals" value={search} onChange={setSearch} placeholder="Name, city or address" className="sm:max-w-sm" />

      <div aria-busy={query.isFetching} className="space-y-4">
        <DataTable
          caption="Hospitals"
          columns={columns}
          rows={query.data?.items}
          getRowId={(h) => h.id}
          loading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          mobileTitle={(h) => (
            <div>
              <p className="font-medium">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.email ?? 'No email'}</p>
            </div>
          )}
          rowActions={(h) => (
            <RowActions label={h.name}>
              <DropdownMenuItem onSelect={() => setEditing(h)}>
                <Pencil aria-hidden="true" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleting(h)}>
                <Trash2 aria-hidden="true" /> Delete
              </DropdownMenuItem>
            </RowActions>
          )}
          empty={
            <EmptyState
              icon={Building2}
              title={values.q ? 'No hospitals match your search' : 'No hospitals yet'}
              description={values.q ? 'Try a different name or city.' : 'Add a hospital before recording organs.'}
              action={
                !values.q && (
                  <Button onClick={() => setCreating(true)}>
                    <Plus aria-hidden="true" /> Add hospital
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={query.data?.meta} onPageChange={setPage} label="hospitals" />
      </div>

      <HospitalFormDialog open={creating} onOpenChange={setCreating} />
      <HospitalFormDialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} hospital={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'hospital'}?`}
        description={
          <p>
            Hospitals that still have organ records cannot be deleted; reassign or remove those records first. Donors who listed this hospital keep
            their accounts.
          </p>
        }
        confirmLabel="Delete hospital"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
