import { Activity, Bean, Droplets, Eye, HeartPulse, Layers, type LucideIcon, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrganType } from '@/types/api';

/* Lucide has no anatomical set; these are the closest consistent metaphors. */
const ICONS: Record<OrganType, LucideIcon> = {
  KIDNEY: Bean,
  LIVER: Activity,
  HEART: HeartPulse,
  LUNG: Wind,
  PANCREAS: Droplets,
  CORNEA: Eye,
  OTHER: Layers,
};

export function OrganIcon({ type, className }: { type: OrganType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={cn('h-4 w-4', className)} aria-hidden="true" />;
}

export function OrganIconTile({ type, className }: { type: OrganType; className?: string }) {
  return (
    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary', className)}>
      <OrganIcon type={type} />
    </div>
  );
}
