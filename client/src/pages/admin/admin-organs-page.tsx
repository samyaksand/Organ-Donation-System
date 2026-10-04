import { HeartPulse, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { type Column, DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { FilterSelect } from '@/components/common/filter-select';
import { OrganIconTile } from '@/components/common/organ-icon';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { RowActions } from '@/components/common/row-actions';
import { SearchInput } from '@/components/common/search-input';
import { OrganStatusBadge } from '@/components/common/status-badges';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useHospitalOptions } from '@/features/hospitals/hooks';
import { OrganFormDialog } from '@/features/organs/components/organ-form-dialog';
import { useAdminDeleteOrgan, useAdminOrgans } from '@/features/organs/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { ORGAN_STATUS_LABELS, ORGAN_TYPE_LABELS, organLabel } from '@/lib/domain';
import { formatDate, pluralize } from '@/lib/format';
import { type AdminOrgan, ORGAN_STATUSES, ORGAN_TYPES, type OrganStatus, type OrganType } from '@/types/api';

export function AdminOrgansPage() {
  useDocumentTitle('Organ management');
  const { values, page, setFilter, setPage } = useListParams(['q', 'organType', 'status', 'hospitalId'] as const);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounce(search, 300);
  useEffect(() => {
    if (debounced !== values.q) setFilter('q', debounced.trim());
  }, [debounced, values.q, setFilter]);

  const organType = (ORGAN_TYPES as readonly string[]).includes(values.organType) ? (values.organType as OrganType) : undefined;
  const status = (ORGAN_STATUSES as readonly string[]).includes(values.status) ? (values.status as OrganStatus) : undefined;
  const query = useAdminOrgans({ q: values.q || undefined, organType, status, hospitalId: values.hospitalId || undefined, page, pageSize: 10 });
  const hospitals = useHospitalOptions();

  // ?addFor=DNXXXXXX (from Donor management) opens the create dialog pre-filled.
  const addFor = searchParams.get('addFor') ?? undefined;
  const [creating, setCreating] = useState(Boolean(addFor));
  const [editing, setEditing] = useState<AdminOrgan | null>(null);
  const [deleting, setDeleting] = useState<AdminOrgan | null>(null);
  const remove = useAdminDeleteOrgan();

  const closeCreate = (open: boolean) => {
    setCreating(open);
    if (!open && addFor) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('addFor');
          return next;
        },
        { replace: true },
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Organ record deleted');
      setDeleting(null);
    } catch (err) {
      toast.error('Could not delete organ record', { description: errorMessage(err) });
    }
  };

  const filtered = Boolean(values.q || organType || status || values.hospitalId);

  const columns: Column<AdminOrgan>[] = [
    {
      id: 'organ',
      header: 'Organ',
      hideOnMobile: true,
      cell: (o) => (
        <div className="flex items-center gap-3">
          <OrganIconTile type={o.organType} />
          <span className="font-medium">{organLabel(o)}</span>
        </div>
      ),
    },
    {
      id: 'donor',
      header: 'Donor',
      cell: (o) => (
        <div>
          <p>{o.donor.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{o.donor.donorCode}</p>
        </div>
      ),
    },
    {
      id: 'hospital',
      header: 'Hospital',
      cell: (o) => (
        <div>
          <p>{o.hospital.name}</p>
          <p className="text-xs text-muted-foreground">{o.hospital.city}</p>
        </div>
      ),
    },
    { id: 'date', header: 'Procured', cell: (o) => formatDate(o.procurementDate) },
    { id: 'status', header: 'Status', hideOnMobile: true, cell: (o) => <OrganStatusBadge status={o.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organ management"
        description={query.data ? `${pluralize(query.data.meta.total, 'organ record')} match the current filters.` : 'All organ records.'}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> Add organ
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-row">
        <SearchInput
          label="Search organs"
          value={search}
          onChange={setSearch}
          placeholder="Donor, Donor ID, hospital or city"
          className="sm:col-span-2 lg:max-w-sm lg:flex-1"
        />
        <FilterSelect
          label="Filter by organ type"
          allLabel="All organ types"
          value={organType ?? ''}
          onChange={(v) => setFilter('organType', v)}
          options={ORGAN_TYPES.map((t) => ({ value: t, label: ORGAN_TYPE_LABELS[t] }))}
        />
        <FilterSelect
          label="Filter by status"
          allLabel="All statuses"
          value={status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={ORGAN_STATUSES.map((s) => ({ value: s, label: ORGAN_STATUS_LABELS[s] }))}
        />
        <FilterSelect
          label="Filter by hospital"
          allLabel="All hospitals"
          value={values.hospitalId}
          onChange={(v) => setFilter('hospitalId', v)}
          options={(hospitals.data ?? []).map((h) => ({ value: h.id, label: `${h.name} — ${h.city}` }))}
          className="lg:w-56"
        />
      </div>

      <div aria-busy={query.isFetching} className="space-y-4">
        <DataTable
          caption="Organ records"
          columns={columns}
          rows={query.data?.items}
          getRowId={(o) => o.id}
          loading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          mobileTitle={(o) => (
            <div className="flex items-center gap-3">
              <OrganIconTile type={o.organType} />
              <div className="space-y-1">
                <p className="font-medium">{organLabel(o)}</p>
                <OrganStatusBadge status={o.status} />
              </div>
            </div>
          )}
          rowActions={(o) => (
            <RowActions label={`${organLabel(o)} from ${o.donor.donorCode}`}>
              <DropdownMenuItem onSelect={() => setEditing(o)}>
                <Pencil aria-hidden="true" /> Edit / change status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleting(o)}>
                <Trash2 aria-hidden="true" /> Delete record
              </DropdownMenuItem>
            </RowActions>
          )}
          empty={
            <EmptyState
              icon={HeartPulse}
              title={filtered ? 'No organ records match these filters' : 'No organ records yet'}
              description={filtered ? 'Try clearing a filter.' : 'Add an organ for a registered donor to get started.'}
              action={
                !filtered && (
                  <Button onClick={() => setCreating(true)}>
                    <Plus aria-hidden="true" /> Add organ
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={query.data?.meta} onPageChange={setPage} label="organs" />
      </div>

      <OrganFormDialog open={creating} onOpenChange={closeCreate} initialDonorCode={addFor} />
      <OrganFormDialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} organ={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete organ record?"
        description={
          deleting && (
            <p>
              The {organLabel(deleting)} record for donor <span className="font-mono">{deleting.donor.donorCode}</span> at {deleting.hospital.name} will be
              permanently removed. To keep history, consider marking it unavailable instead.
            </p>
          )
        }
        confirmLabel="Delete record"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
