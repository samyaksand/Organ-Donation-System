import { Eye, KeyRound, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { type Column, DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { FilterSelect } from '@/components/common/filter-select';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { RowActions } from '@/components/common/row-actions';
import { SearchInput } from '@/components/common/search-input';
import { DonorStatusBadge } from '@/components/common/status-badges';
import { Badge } from '@/components/ui/badge';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DonorDetailSheet } from '@/features/admin/components/donor-detail-sheet';
import { EditDonorDialog, ResetPasswordDialog } from '@/features/admin/components/donor-dialogs';
import { useAdminDeleteDonor, useAdminDonors } from '@/features/admin/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { DONOR_STATUS_LABELS } from '@/lib/domain';
import { formatDate, pluralize } from '@/lib/format';
import { DONOR_STATUSES, type DonorListItem, type DonorStatus } from '@/types/api';

/** Donor management: replaces the legacy "Update Record" / "Delete Record" forms keyed by Donor ID. */
export function AdminDonorsPage() {
  useDocumentTitle('Donor management');
  const navigate = useNavigate();
  const { values, page, setFilter, setPage } = useListParams(['q', 'status'] as const);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounce(search, 300);
  useEffect(() => {
    if (debounced !== values.q) setFilter('q', debounced.trim());
  }, [debounced, values.q, setFilter]);

  const status = (DONOR_STATUSES as readonly string[]).includes(values.status) ? (values.status as DonorStatus) : undefined;
  const query = useAdminDonors({ q: values.q || undefined, status, page, pageSize: 10 });

  const [viewId, setViewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DonorListItem | null>(null);
  const [resetting, setResetting] = useState<DonorListItem | null>(null);
  const [deleting, setDeleting] = useState<DonorListItem | null>(null);
  const remove = useAdminDeleteDonor();

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`Deleted ${deleting.name}`);
      setDeleting(null);
    } catch (err) {
      toast.error('Could not delete donor', { description: errorMessage(err) });
    }
  };

  const columns: Column<DonorListItem>[] = [
    {
      id: 'donor',
      header: 'Donor',
      hideOnMobile: true,
      cell: (d) => (
        <div className="min-w-0">
          <button type="button" onClick={() => setViewId(d.id)} className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {d.name}
          </button>
          <p className="font-mono text-xs text-muted-foreground">{d.donorCode}</p>
        </div>
      ),
    },
    { id: 'email', header: 'Email', cell: (d) => <span className="break-all">{d.email}</span> },
    { id: 'city', header: 'Location', cell: (d) => `${d.city}, ${d.state}` },
    { id: 'organs', header: 'Organs', className: 'text-right md:text-left', cell: (d) => <span className="tabular-nums">{d.organCount}</span> },
    {
      id: 'status',
      header: 'Status',
      cell: (d) => (
        <div className="flex flex-wrap gap-1">
          <DonorStatusBadge status={d.status} />
          {d.hasPendingWithdrawal && <Badge variant="warning">Withdrawal requested</Badge>}
        </div>
      ),
    },
    { id: 'registered', header: 'Registered', cell: (d) => formatDate(d.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donor management"
        description={query.data ? `${pluralize(query.data.meta.total, 'donor')} match the current filters.` : 'Registered donors.'}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput label="Search donors" value={search} onChange={setSearch} placeholder="Name, email, Donor ID or city" className="sm:max-w-sm sm:flex-1" />
        <FilterSelect
          label="Filter by status"
          allLabel="All statuses"
          value={status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={DONOR_STATUSES.map((s) => ({ value: s, label: DONOR_STATUS_LABELS[s] }))}
        />
      </div>

      <div aria-busy={query.isFetching} className="space-y-4">
        <DataTable
          caption="Donors"
          columns={columns}
          rows={query.data?.items}
          getRowId={(d) => d.id}
          loading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          mobileTitle={(d) => (
            <button type="button" onClick={() => setViewId(d.id)} className="text-left">
              <p className="font-medium">{d.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{d.donorCode}</p>
            </button>
          )}
          rowActions={(d) => (
            <RowActions label={d.name}>
              <DropdownMenuItem onSelect={() => setViewId(d.id)}>
                <Eye aria-hidden="true" /> View details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditing(d)}>
                <Pencil aria-hidden="true" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setResetting(d)}>
                <KeyRound aria-hidden="true" /> Reset password
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`/admin/organs?addFor=${encodeURIComponent(d.donorCode)}`)}>
                <Plus aria-hidden="true" /> Add organ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleting(d)}>
                <Trash2 aria-hidden="true" /> Delete donor
              </DropdownMenuItem>
            </RowActions>
          )}
          empty={
            <EmptyState
              icon={Users}
              title={values.q || status ? 'No donors match these filters' : 'No donors registered yet'}
              description={values.q || status ? 'Try a different search term or status.' : 'Donors appear here after they register.'}
            />
          }
        />
        <Pagination meta={query.data?.meta} onPageChange={setPage} label="donors" />
      </div>

      <DonorDetailSheet donorId={viewId} onOpenChange={(open) => !open && setViewId(null)} />
      <EditDonorDialog donor={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ResetPasswordDialog donor={resetting} onOpenChange={(open) => !open && setResetting(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'donor'}?`}
        description={
          <div className="space-y-2">
            <p>
              This permanently deletes the donor account <span className="font-mono">{deleting?.donorCode}</span> together with their next-of-kin
              details, {pluralize(deleting?.organCount ?? 0, 'organ record')} and withdrawal requests.
            </p>
            <p className="font-medium text-foreground">This cannot be undone.</p>
          </div>
        }
        confirmLabel="Delete donor"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
