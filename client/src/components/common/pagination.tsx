import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import type { PageMeta } from '@/types/api';

interface PaginationProps {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({ meta, onPageChange, label = 'results' }: PaginationProps) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{formatNumber(from)}</span>–
        <span className="font-medium text-foreground">{formatNumber(to)}</span> of{' '}
        <span className="font-medium text-foreground">{formatNumber(meta.total)}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(meta.page - 1)} disabled={meta.page <= 1}>
          <ChevronLeft aria-hidden="true" /> Previous
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(meta.page + 1)} disabled={meta.page >= meta.totalPages}>
          Next <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
