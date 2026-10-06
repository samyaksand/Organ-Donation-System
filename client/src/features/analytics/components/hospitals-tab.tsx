import { Building2, CheckCircle2, CircleSlash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type Column, DataTable } from '@/components/common/data-table';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHospitalAnalytics } from '../hooks';
import { KpiCard } from './kpi-card';

type Row = NonNullable<ReturnType<typeof useHospitalAnalytics>['data']>['hospitals'][number];

/** "Where is it happening?" at the hospital level. */
export function HospitalsTab() {
  const { data, isPending, isError, error, refetch, isFetching } = useHospitalAnalytics();

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  const columns: Column<Row>[] = [
    {
      id: 'hospital',
      header: 'Hospital',
      cell: (h) => (
        <div>
          <p className="font-medium">{h.name}</p>
          <p className="text-xs text-muted-foreground">
            {h.city}
            {h.state ? `, ${h.state}` : ''}
          </p>
        </div>
      ),
    },
    { id: 'available', header: 'Available organs', cell: (h) => h.available },
    { id: 'pending', header: 'Pending', hideOnMobile: true, cell: (h) => h.pending },
    { id: 'unavailable', header: 'Unavailable', hideOnMobile: true, cell: (h) => h.unavailable },
    { id: 'total', header: 'Total organs', cell: (h) => h.totalOrgans },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total hospitals" value={data?.total} loading={isPending} icon={Building2} explain="All registered hospitals." />
        <KpiCard
          label="With availability"
          value={data?.withAvailability}
          loading={isPending}
          icon={CheckCircle2}
          tone="success"
          explain="Hospitals with at least one AVAILABLE organ recorded right now."
        />
        <KpiCard
          label="Zero availability"
          value={data?.zeroAvailability}
          loading={isPending}
          icon={CircleSlash}
          tone="destructive"
          explain="Hospitals with no AVAILABLE organs recorded right now."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hospital activity</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            caption="Hospital organ activity"
            columns={columns}
            rows={data?.hospitals}
            getRowId={(h) => h.id}
            loading={isPending}
            mobileTitle={(h) => (
              <div>
                <p className="font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.city}</p>
              </div>
            )}
            empty={<p className="py-8 text-center text-sm text-muted-foreground">No hospitals registered yet.</p>}
          />
        </CardContent>
      </Card>

      {!isPending && data && data.zeroAvailabilityHospitals.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">Hospitals with zero availability</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {data.zeroAvailabilityHospitals.map((h) => (
                <li key={h.id}>
                  <Link to={`/admin/organs?hospitalId=${h.id}`} className="text-foreground underline-offset-2 hover:underline">
                    {h.name}
                  </Link>{' '}
                  - {h.city}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
