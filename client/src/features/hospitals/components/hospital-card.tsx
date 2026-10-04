import { ArrowRight, Building2, Mail, MapPin, Phone } from 'lucide-react';
import type * as React from 'react';
import { Link } from 'react-router-dom';
import { OrganIcon } from '@/components/common/organ-icon';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';
import { pluralize } from '@/lib/format';
import type { HospitalWithAvailability } from '@/types/api';

export function HospitalCard({ hospital, actions }: { hospital: HospitalWithAvailability; actions?: React.ReactNode }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight">{hospital.name}</h3>
            <p className="text-sm text-muted-foreground">
              {hospital.city}
              {hospital.state ? `, ${hospital.state}` : ''}
            </p>
          </div>
        </div>
        {actions}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <dt>
            <MapPin className="mt-0.5 h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Address</span>
          </dt>
          <dd>{hospital.address}</dd>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <dt>
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Phone</span>
          </dt>
          <dd>
            <a href={`tel:${hospital.phone.replace(/[^\d+]/g, '')}`} className="text-primary underline-offset-4 hover:underline">
              {hospital.phone}
            </a>
          </dd>
        </div>
        {hospital.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <dt>
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Email</span>
            </dt>
            <dd className="min-w-0 truncate">
              <a href={`mailto:${hospital.email}`} className="text-primary underline-offset-4 hover:underline">
                {hospital.email}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex-1 border-t pt-4">
        <p className="text-sm font-medium">
          {hospital.availableOrganCount > 0 ? pluralize(hospital.availableOrganCount, 'organ') + ' available' : 'No organs currently available'}
        </p>
        {hospital.availableByType.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Available organs by type">
            {hospital.availableByType.map((t) => (
              <li key={t.organType}>
                <Badge variant="secondary">
                  <OrganIcon type={t.organType} />
                  {ORGAN_TYPE_LABELS[t.organType]} · {t.count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hospital.availableOrganCount > 0 && (
        <Link
          to={`/organs?city=${encodeURIComponent(hospital.city)}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View availability in {hospital.city} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </Card>
  );
}
