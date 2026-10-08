import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A minimal, dependency-free accordion (no @radix-ui/react-accordion - not installed, and a
 * plain controlled-collapse component is the smallest thing that fits here, consistent with
 * this app's general preference for not reaching for a library when a few lines of React do the
 * job - see command-palette.tsx's own header comment for the same reasoning). Single-open
 * ("type=single collapsible") semantics only, which is all this app currently needs.
 */
interface AccordionContextValue {
  openValue: string | null;
  toggle: (value: string) => void;
}
const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  children,
  className,
  defaultValue,
}: {
  children: React.ReactNode;
  className?: string;
  type?: 'single';
  collapsible?: boolean;
  defaultValue?: string;
}) {
  const [openValue, setOpenValue] = React.useState<string | null>(defaultValue ?? null);
  const toggle = React.useCallback((value: string) => setOpenValue((cur) => (cur === value ? null : value)), []);
  return (
    <AccordionContext.Provider value={{ openValue, toggle }}>
      <div className={cn('divide-y rounded-lg border', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

const ItemContext = React.createContext<string>('');

export function AccordionItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return (
    <ItemContext.Provider value={value}>
      <div className={className}>{children}</div>
    </ItemContext.Provider>
  );
}

export function AccordionTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(AccordionContext);
  const value = React.useContext(ItemContext);
  if (!ctx) throw new Error('AccordionTrigger must be used within an Accordion');
  const open = ctx.openValue === value;
  return (
    <button
      type="button"
      className={cn('flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      aria-expanded={open}
      onClick={() => ctx.toggle(value)}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
    </button>
  );
}

export function AccordionContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(AccordionContext);
  const value = React.useContext(ItemContext);
  if (!ctx) throw new Error('AccordionContent must be used within an Accordion');
  const open = ctx.openValue === value;
  if (!open) return null;
  return <div className={cn('px-4 pb-4', className)}>{children}</div>;
}
