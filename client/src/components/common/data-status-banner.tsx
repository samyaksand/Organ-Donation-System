import { Info } from 'lucide-react';

/**
 * A single, concise statement that the figures shown are simulated/demo data, not a live
 * national registry or real transplant allocation system. Used once per page, near the data it
 * describes - never repeated as a persistent overlay. Keep the wording calm and factual.
 */
export function DataStatusBanner({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Demo data for a database-systems course project - not a live national registry or real
      transplant allocation system.
    </p>
  );
}
