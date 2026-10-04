import { CalendarDays, MapPin, Phone } from 'lucide-react';
import { OrganIconTile } from '@/components/common/organ-icon';
import { OrganStatusBadge } from '@/components/common/status-badges';
import { Card } from '@/components/ui/card';
import { organLabel } from '@/lib/domain';
import { formatDate } from '@/lib/format';
import type { PublicOrgan } from '@/types/api';

/** Public availability record: organ + hospital contact. Contains no donor information by design. */
export function AvailabilityResultCard({ organ }: { organ: PublicOrgan }) {
  const { hospital } = organ;
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <OrganIconTile type={organ.organType} />
          <div>
            <h3 className="font-semibold leading-tight">{organLabel(organ)}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Procured {formatDate(organ.procurementDate)}
            </p>
          </div>
        </div>
        <OrganStatusBadge status={organ.status} />
      </div>

      <div className="mt-4 space-y-2 border-t pt-4 text-sm">
        <p className="font-medium text-foreground">{hospital.name}</p>
        <p className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {hospital.address}, {hospital.city}
            {hospital.state ? `, ${hospital.state}` : ''}
          </span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <a href={`tel:${hospital.phone.replace(/[^\d+]/g, '')}`} className="text-primary underline-offset-4 hover:underline">
            {hospital.phone}
          </a>
        </p>
      </div>
    </Card>
  );
}
