import type { OrganType } from '@prisma/client';

/** Server-side mirror of client/src/lib/domain.ts's ORGAN_TYPE_LABELS - used only for the
 * certificate PDF's human-readable organ name. Keep in sync if organ types change. */
export const ORGAN_TYPE_LABELS: Record<OrganType, string> = {
  KIDNEY: 'Kidney',
  LIVER: 'Liver',
  HEART: 'Heart',
  LUNG: 'Lung',
  PANCREAS: 'Pancreas',
  CORNEA: 'Cornea',
  OTHER: 'Other organ / tissue',
};
