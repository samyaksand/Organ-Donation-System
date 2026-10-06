import { Check, ClipboardList, Eye, Plus, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Column, DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { FilterSelect } from '@/components/common/filter-select';
import { OrganIconTile } from '@/components/common/organ-icon';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { RowActions } from '@/components/common/row-actions';
import { SearchInput } from '@/components/common/search-input';
import { OrganRequestStatusBadge } from '@/components/common/status-badges';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { OrganRequestFormDialog } from '@/features/organ-requests/components/organ-request-form-dialog';
import { ReviewOrganRequestDialog } from '@/features/organ-requests/components/review-organ-request-dialog';
import { useCancelOrganRequest, useOrganRequests } from '@/features/organ-requests/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { organLabel } from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import { ORGAN_REQUEST_STATUSES, type OrganRequest, type OrganRequestStatus } from '@/types/api';

/** Hospital organ request & fulfillment queue: availability -> request -> admin decision -> organ allocation. */
export function AdminOrganRequestsPage() {
  useDocumentTitle('Organ requests');
  const { values, page, setFilter, setPage } = useListParams(['q', 'status'] as const);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounce(search, 300);
  useEffect(() => {
    if (debounced !== values.q) setFilter('q', debounced.trim());
  }, [debounced, values.q, setFilter]);

  const tab =
    values.status === 'ALL' || (ORGAN_REQUEST_STATUSES as readonly string[]).includes(values.status) ? values.status : 'PENDING';
  const status = tab === 'ALL' ? undefined : (tab as OrganRequestStatus);
  const query = useOrganRequests({ q: values.q || undefined, status, page, pageSize: 10 });

  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<{ request: OrganRequest; decision: 'APPROVED' | 'DECLINED' } | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const cancel = useCancelOrganRequest();

  const confirmCancel = async (r: OrganRequest) => {
    setCancelling(r.id);
    try {
      await cancel.mutateAsync(r.id);
    } finally {
      setCancelling(null);
    }
  };

  const columns: Column<OrganRequest>[] = [
    {
      id: 'organ',
      header: 'Organ',
      hideOnMobile: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <OrganIconTile type={r.organ.organType} />
          <div>
            <span className="font-medium">{organLabel(r.organ)}</span>
            <p className="font-mono text-xs text-muted-foreground">{r.organ.donorCode}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'hospital',
      header: 'Requesting hospital',
      cell: (r) => (
        <div>
          <p>{r.hospital.name}</p>
          <p className="text-xs text-muted-foreground">{r.hospital.city}</p>
        </div>
      ),
    },
    { id: 'submitted', header: 'Submitted', cell: (r) => formatDateTime(r.createdAt) },
    { id: 'status', header: 'Status', hideOnMobile: true, cell: (r) => <OrganRequestStatusBadge status={r.status} /> },
  ];

  const filtered = Boolean(values.q);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organ requests"
        description="Hospital requests for specific available organs. Review each request and allocate or decline."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> New request
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterSelect
          label="Filter by status"
          allLabel="All requests"
          value={tab === 'PENDING' ? '' : tab}
          onChange={(v) => setFilter('status', v || 'PENDING')}
          options={ORGAN_REQUEST_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
        />
        <SearchInput label="Search requests" value={search} onChange={setSearch} placeholder="Hospital, city or Donor ID" className="lg:w-80" />
      </div>

      <div aria-busy={query.isFetching} className="space-y-4">
        <DataTable
          caption="Organ requests"
          columns={columns}
          rows={query.data?.items}
          getRowId={(r) => r.id}
          loading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          mobileTitle={(r) => (
            <div className="space-y-1">
              <p className="font-medium">
                {r.hospital.name} <span className="text-xs text-muted-foreground">{organLabel(r.organ)}</span>
              </p>
              <OrganRequestStatusBadge status={r.status} />
            </div>
          )}
          rowActions={(r) => (
            <div className="flex items-center justify-end gap-1">
              {r.status === 'PENDING' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewing({ request: r, decision: 'APPROVED' })}
                    aria-label={`Approve request from ${r.hospital.name}`}
                  >
                    <Check aria-hidden="true" /> <span className="hidden xl:inline">Approve</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReviewing({ request: r, decision: 'DECLINED' })}
                    aria-label={`Decline request from ${r.hospital.name}`}
                  >
                    <X aria-hidden="true" /> <span className="hidden xl:inline">Decline</span>
                  </Button>
                </>
              )}
              <RowActions label={`request from ${r.hospital.name}`}>
                <DropdownMenuItem asChild>
                  <Link to={`/admin/organ-requests/${r.id}`}>
                    <Eye aria-hidden="true" /> View details
                  </Link>
                </DropdownMenuItem>
                {r.status === 'PENDING' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive disabled={cancelling === r.id} onSelect={() => void confirmCancel(r)}>
                      <XCircle aria-hidden="true" /> Cancel request
                    </DropdownMenuItem>
                  </>
                )}
              </RowActions>
            </div>
          )}
          empty={
            <EmptyState
              icon={ClipboardList}
              title={tab === 'PENDING' ? 'No requests awaiting review' : 'No requests found'}
              description={tab === 'PENDING' ? 'New hospital organ requests will appear here.' : 'Try another filter.'}
              action={
                !filtered && (
                  <Button onClick={() => setCreating(true)}>
                    <Plus aria-hidden="true" /> New request
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={query.data?.meta} onPageChange={setPage} label="requests" />
      </div>

      <OrganRequestFormDialog open={creating} onOpenChange={setCreating} />
      <ReviewOrganRequestDialog
        request={reviewing?.request ?? null}
        decision={reviewing?.decision ?? 'APPROVED'}
        onOpenChange={(open) => !open && setReviewing(null)}
      />
    </div>
  );
}
