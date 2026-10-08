import { Activity, Eye, Monitor, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useSession } from '@/features/auth/hooks';
import { useMyActivity, useMySessions } from '../hooks';

interface OverviewCardProps {
  icon: LucideIcon;
  title: string;
  value: React.ReactNode;
  hint?: string;
  onClick?: () => void;
}

function OverviewCard({ icon: Icon, title, value, hint, onClick }: OverviewCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer transition-colors hover:border-primary/40' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-lg font-semibold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Account Security / Active Sessions / Recent Activity / Privacy & Access overview, driving
 * which tab the page opens to on click - see security-center-page.tsx. */
export function SecurityOverviewCards({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: user } = useSession();
  const sessions = useMySessions();
  const activity = useMyActivity(5);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewCard
        icon={ShieldCheck}
        title="Account security"
        value={
          sessions.isPending ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <Badge variant="secondary">{user?.donor?.status ?? 'Active'}</Badge>
          )
        }
        hint={`Role: ${user?.role ?? ''}`}
        onClick={() => onNavigate('overview')}
      />
      <OverviewCard
        icon={Monitor}
        title="Active sessions"
        value={sessions.isPending ? <Skeleton className="h-6 w-10" /> : `${sessions.data?.length ?? 0} device${(sessions.data?.length ?? 0) === 1 ? '' : 's'}`}
        hint="Manage signed-in devices"
        onClick={() => onNavigate('sessions')}
      />
      <OverviewCard
        icon={Activity}
        title="Recent activity"
        value={activity.isPending ? <Skeleton className="h-6 w-10" /> : `${activity.data?.length ?? 0} event${(activity.data?.length ?? 0) === 1 ? '' : 's'}`}
        hint={activity.data?.[0] ? `Latest: ${formatDateTime(activity.data[0].createdAt)}` : 'View activity'}
        onClick={() => onNavigate('activity')}
      />
      <OverviewCard icon={Eye} title="Privacy & access" value="Explore" hint="Who can see your information" onClick={() => onNavigate('privacy')} />
    </div>
  );
}
