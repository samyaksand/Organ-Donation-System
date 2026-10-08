import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/hooks';
import { formatDateTime } from '@/lib/format';
import { useMyActivity, useMySessions } from '../hooks';

/**
 * Account status, role, last sign-in and password-change timestamps - the latter two are
 * derived from the EXISTING activity feed (most recent LOGIN / PASSWORD_CHANGED SecurityEvent),
 * not a new column, since that data is already recorded there (see services/
 * securityActivity.service.ts). No new storage for information the audit trail already has.
 */
export function AccountSecuritySummary() {
  const { data: user } = useSession();
  const activity = useMyActivity(50);
  const sessions = useMySessions();

  const lastLogin = activity.data?.find((e) => e.action === 'LOGIN');
  const lastPasswordChange = activity.data?.find((e) => e.action === 'PASSWORD_CHANGED');

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Account status', value: user?.donor?.status ?? (user?.role === 'DONOR' ? 'Active' : user?.role ?? '-') },
    { label: 'Current role', value: user?.role ?? '-' },
    {
      label: 'Last successful sign-in',
      value: activity.isPending ? <Skeleton className="h-4 w-32" /> : lastLogin ? formatDateTime(lastLogin.createdAt) : 'No recorded sign-ins yet',
    },
    {
      label: 'Password last changed',
      value: activity.isPending ? <Skeleton className="h-4 w-32" /> : lastPasswordChange ? formatDateTime(lastPasswordChange.createdAt) : 'Never changed since registration',
    },
    {
      label: 'Active sessions',
      value: sessions.isPending ? <Skeleton className="h-4 w-10" /> : `${sessions.data?.length ?? 0}`,
    },
    {
      label: 'Recent security activity',
      value: activity.isPending ? <Skeleton className="h-4 w-10" /> : `${activity.data?.length ?? 0} event${(activity.data?.length ?? 0) === 1 ? '' : 's'}`,
    },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
