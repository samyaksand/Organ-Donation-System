import { HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ to = '/', className, compact = false }: { to?: string; className?: string; compact?: boolean }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2 rounded-md font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulse className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className={cn('whitespace-nowrap leading-tight', compact ? 'sr-only' : 'max-[359px]:sr-only')}>OrganFlow</span>
    </Link>
  );
}
