import type * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ErrorState } from './error-state';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Omit from the stacked mobile card (e.g. data already shown in the card title). */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: React.ReactNode;
  /** Primary line of the mobile card. */
  mobileTitle: (row: T) => React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
}

/**
 * Responsive data table: a real <table> from `md` up, stacked definition-list cards below.
 * Handles loading (skeleton rows), error (retry) and empty states itself.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  loading,
  error,
  onRetry,
  empty,
  mobileTitle,
  rowActions,
}: DataTableProps<T>) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  if (loading || !rows) {
    return (
      <div className="space-y-2" role="status" aria-label={`Loading ${caption.toLowerCase()}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
              {rowActions && (
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
                {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={getRowId(row)} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{mobileTitle(row)}</div>
              {rowActions && <div className="-mr-2 -mt-1 shrink-0">{rowActions(row)}</div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((col) => (
                  <div key={col.id} className={cn('min-w-0')}>
                    <dt className="text-xs text-muted-foreground">{col.header}</dt>
                    <dd className="mt-0.5 break-words">{col.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
