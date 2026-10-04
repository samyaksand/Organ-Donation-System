import { Check, FileClock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Column, DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { SearchInput } from '@/components/common/search-input';
import { WithdrawalStatusBadge } from '@/components/common/status-badges';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewWithdrawalDialog } from '@/features/withdrawals/components/review-withdrawal-dialog';
import { useAdminWithdrawals } from '@/features/withdrawals/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useListParams } from '@/hooks/use-page-param';
import { formatDateTime } from '@/lib/format';
import { type AdminWithdrawal, WITHDRAWAL_STATUSES, type WithdrawalStatus } from '@/types/api';

/** Withdrawal requests (legacy `deletionreason` list on the admin page), now reviewable. */
export function AdminWithdrawalsPage() {
  useDocumentTitle('Withdrawal requests');
  const { values, page, setFilter, setPage } = useListParams(['q', 'status'] as const);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounce(search, 300);
  useEffect(() => {
    if (debounced !== values.q) setFilter('q', debounced.trim());
  }, [debounced, values.q, setFilter]);

  // Default view is the pending queue; "ALL" shows every request.
  const tab = values.status === 'ALL' || (WITHDRAWAL_STATUSES as readonly string[]).includes(values.status) ? values.status : 'PENDING';
  const status = tab === 'ALL' ? undefined : (tab as WithdrawalStatus);
  const query = useAdminWithdrawals({ q: values.q || undefined, status, page, pageSize: 10 });

  const [reviewing, setReviewing] = useState<{ request: AdminWithdrawal; decision: 'APPROVED' | 'REJECTED' } | null>(null);

  const columns: Column<AdminWithdrawal>[] = [
    {
      id: 'donor',
      header: 'Donor',
      hideOnMobile: true,
      cell: (w) => (
        <div>
          <p className="font-medium">{w.donor.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{w.donor.donorCode}</p>
        </div>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      className: 'md:max-w-sm',
      cell: (w) => (
        <p className="line-clamp-3 whitespace-pre-line" title={w.reason}>
          {w.reason}
        </p>
      ),
    },
    { id: 'submitted', header: 'Submitted', cell: (w) => formatDateTime(w.createdAt) },
    { id: 'status', header: 'Status', hideOnMobile: true, cell: (w) => <WithdrawalStatusBadge status={w.status} /> },
    {
      id: 'review',
      header: 'Reviewed',
      cell: (w) =>
        w.reviewedAt ? (
          <div className="text-xs">
            <p>{formatDateTime(w.reviewedAt)}</p>
            {w.reviewedBy && <p className="text-muted-foreground">by {w.reviewedBy}</p>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Withdrawal requests" description="Donors asking to withdraw their registration. Review each request and leave an optional note." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(v) => setFilter('status', v === 'PENDING' ? '' : v)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="REJECTED">Declined</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput label="Search requests" value={search} onChange={setSearch} placeholder="Donor, Donor ID or reason" className="lg:w-80" />
      </div>

      <div aria-busy={query.isFetching} className="space-y-4">
        <DataTable
          caption="Withdrawal requests"
          columns={columns}
          rows={query.data?.items}
          getRowId={(w) => w.id}
          loading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          mobileTitle={(w) => (
            <div className="space-y-1">
              <p className="font-medium">
                {w.donor.name} <span className="font-mono text-xs text-muted-foreground">{w.donor.donorCode}</span>
              </p>
              <WithdrawalStatusBadge status={w.status} />
            </div>
          )}
          rowActions={(w) =>
            w.status === 'PENDING' ? (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setReviewing({ request: w, decision: 'APPROVED' })} aria-label={`Approve request from ${w.donor.name}`}>
                  <Check aria-hidden="true" /> <span className="hidden xl:inline">Approve</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReviewing({ request: w, decision: 'REJECTED' })} aria-label={`Decline request from ${w.donor.name}`}>
                  <X aria-hidden="true" /> <span className="hidden xl:inline">Decline</span>
                </Button>
              </div>
            ) : null
          }
          empty={
            <EmptyState
              icon={FileClock}
              title={tab === 'PENDING' ? 'No requests awaiting review' : 'No requests found'}
              description={tab === 'PENDING' ? 'New withdrawal requests from donors will appear here.' : 'Try another filter.'}
            />
          }
        />
        <Pagination meta={query.data?.meta} onPageChange={setPage} label="requests" />
      </div>

      <ReviewWithdrawalDialog
        request={reviewing?.request ?? null}
        decision={reviewing?.decision ?? 'APPROVED'}
        onOpenChange={(open) => !open && setReviewing(null)}
      />
    </div>
  );
}
