import type { DonorStatus, Gender, OrganRequestStatus, OrganStatus, OrganType, WithdrawalStatus } from '@/types/api';

export const ORGAN_TYPE_LABELS: Record<OrganType, string> = {
  KIDNEY: 'Kidney',
  LIVER: 'Liver',
  HEART: 'Heart',
  LUNG: 'Lung',
  PANCREAS: 'Pancreas',
  CORNEA: 'Cornea',
  OTHER: 'Other organ / tissue',
};

export const ORGAN_TYPE_DESCRIPTIONS: Record<OrganType, string> = {
  KIDNEY: 'The most commonly transplanted organ; can be donated by living donors.',
  LIVER: 'Regenerates after partial donation, so living donation is possible.',
  HEART: 'Donated after death; matched rapidly due to short preservation time.',
  LUNG: 'Single or double lung transplants for end-stage lung disease.',
  PANCREAS: 'Often transplanted with a kidney for people with type 1 diabetes.',
  CORNEA: 'Donated corneal tissue can restore sight; it is recovered after death.',
  OTHER: 'Other organs and tissues such as skin, bone, heart valves or intestine.',
};

export const ORGAN_STATUS_LABELS: Record<OrganStatus, string> = {
  PENDING: 'Pending review',
  AVAILABLE: 'Available',
  UNAVAILABLE: 'Unavailable',
};

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
};

export const ORGAN_REQUEST_STATUS_LABELS: Record<OrganRequestStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

export const DONOR_STATUS_LABELS: Record<DonorStatus, string> = {
  PENDING: 'Pending verification',
  ACTIVE: 'Active',
  WITHDRAWN: 'Withdrawn',
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export function organLabel(organ: { organType: OrganType; otherOrganName?: string | null }) {
  return organ.organType === 'OTHER' && organ.otherOrganName ? organ.otherOrganName : ORGAN_TYPE_LABELS[organ.organType];
}
