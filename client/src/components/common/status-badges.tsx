import { Ban, CheckCircle2, CircleSlash, Clock, UserCheck, UserX, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DONOR_STATUS_LABELS, ORGAN_REQUEST_STATUS_LABELS, ORGAN_STATUS_LABELS, WITHDRAWAL_STATUS_LABELS } from '@/lib/domain';
import type { DonorStatus, OrganRequestStatus, OrganStatus, WithdrawalStatus } from '@/types/api';

/* Every status badge pairs colour with an icon and a text label (never colour alone). */

export function OrganStatusBadge({ status }: { status: OrganStatus }) {
  const config = {
    AVAILABLE: { variant: 'success', Icon: CheckCircle2 },
    PENDING: { variant: 'warning', Icon: Clock },
    UNAVAILABLE: { variant: 'muted', Icon: CircleSlash },
  } as const;
  const { variant, Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {ORGAN_STATUS_LABELS[status]}
    </Badge>
  );
}

export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  const config = {
    PENDING: { variant: 'warning', Icon: Clock },
    APPROVED: { variant: 'success', Icon: CheckCircle2 },
    REJECTED: { variant: 'destructive', Icon: XCircle },
  } as const;
  const { variant, Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {WITHDRAWAL_STATUS_LABELS[status]}
    </Badge>
  );
}

export function OrganRequestStatusBadge({ status }: { status: OrganRequestStatus }) {
  const config = {
    PENDING: { variant: 'warning', Icon: Clock },
    APPROVED: { variant: 'success', Icon: CheckCircle2 },
    DECLINED: { variant: 'destructive', Icon: XCircle },
    CANCELLED: { variant: 'muted', Icon: Ban },
  } as const;
  const { variant, Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {ORGAN_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DonorStatusBadge({ status }: { status: DonorStatus }) {
  const config = {
    PENDING: { variant: 'warning', Icon: Clock },
    ACTIVE: { variant: 'success', Icon: UserCheck },
    WITHDRAWN: { variant: 'muted', Icon: UserX },
  } as const;
  const { variant, Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {DONOR_STATUS_LABELS[status]}
    </Badge>
  );
}
