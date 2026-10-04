import { HeartPulse, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type Column, DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { OrganIconTile } from '@/components/common/organ-icon';
import { PageHeader } from '@/components/common/page-header';
import { OrganStatusBadge } from '@/components/common/status-badges';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/hooks';
import { useMyOrgans } from '@/features/organs/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { organLabel } from '@/lib/domain';
import { formatDate } from '@/lib/format';
import type { OwnOrgan } from '@/types/api';

const columns: Column<OwnOrgan>[] = [
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
    id: 'hospital',
    header: 'Hospital',
    cell: (o) => (
      <div>
        <p>{o.hospital.name}</p>
        <p className="text-xs text-muted-foreground">{o.hospital.city}</p>
      </div>
    ),
  },
  { id: 'date', header: 'Procurement date', cell: (o) => formatDate(o.procurementDate) },
  { id: 'status', header: 'Status', hideOnMobile: true, cell: (o) => <OrganStatusBadge status={o.status} /> },
  { id: 'added', header: 'Registered', cell: (o) => formatDate(o.createdAt) },
];

export function DonorOrgansPage() {
  useDocumentTitle('My organs');
  const { data: user } = useSession();
  const organs = useMyOrgans();
  const canAdd = user?.donor?.status !== 'WITHDRAWN';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My organs"
        description="Organs you have registered, the hospital responsible and their current status."
        actions={
          canAdd && (
            <Button asChild>
              <Link to="/donor/organs/new">
                <Plus aria-hidden="true" /> Add organ
              </Link>
            </Button>
          )
        }
      />
      <DataTable
        caption="Registered organs"
        columns={columns}
        rows={organs.data}
        getRowId={(o) => o.id}
        loading={organs.isPending}
        error={organs.error}
        onRetry={() => void organs.refetch()}
        mobileTitle={(o) => (
          <div className="flex items-center gap-3">
            <OrganIconTile type={o.organType} />
            <div className="space-y-1">
              <p className="font-medium">{organLabel(o)}</p>
              <OrganStatusBadge status={o.status} />
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={HeartPulse}
            title="No organs registered yet"
            description="Add the organs you are pledging so the hospital can verify them."
            action={
              canAdd && (
                <Button asChild>
                  <Link to="/donor/organs/new">
                    <Plus aria-hidden="true" /> Add organ
                  </Link>
                </Button>
              )
            }
          />
        }
      />
    </div>
  );
}
