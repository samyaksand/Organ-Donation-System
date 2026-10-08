import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BarChart3, Building2, HeartHandshake, LayoutDashboard, Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/features/auth/hooks';
import { homePathFor } from '@/features/auth/session';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  to: string;
}

const BASE_COMMANDS: Command[] = [
  { id: 'organs', label: 'Search organs', hint: 'Explore organ availability', icon: Search, to: '/organs' },
  { id: 'hospitals', label: 'Find hospitals', hint: 'Browse the hospital network', icon: Building2, to: '/hospitals' },
  { id: 'analytics', label: 'View analytics', hint: 'Public, aggregate figures', icon: BarChart3, to: '/analytics' },
  { id: 'investigate', label: 'Investigate an operational issue', hint: 'Ask an operational question', icon: Sparkles, to: '/investigate' },
  { id: 'pledge', label: 'Pledge to donate', hint: 'Quick, no-account pledge', icon: HeartHandshake, to: '/pledge' },
  { id: 'security', label: 'Privacy & Security', hint: 'How access control works', icon: ShieldCheck, to: '/security' },
];

/**
 * Lightweight global command palette (Ctrl/Cmd+K). Deliberately a plain filtered list over a
 * fixed destination set - not a search engine, not cmdk - matching the rest of this app's
 * preference for the smallest tool that fits.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { data: user } = useSession();

  const commands = useMemo<Command[]>(() => {
    const list = [...BASE_COMMANDS];
    if (user) {
      list.push({ id: 'dashboard', label: 'Go to dashboard', hint: user.role === 'DONOR' ? 'Your donor portal' : 'Admin console', icon: LayoutDashboard, to: homePathFor(user.role) });
    }
    return list;
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          if (!next) {
            setQuery('');
            setActiveIndex(0);
          }
          return next;
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setQueryAndReset = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const toggle = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setActiveIndex(0);
    }
  };

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      go(filtered[activeIndex]!.to);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={toggle}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20%] z-50 w-[90vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={(el) => el?.focus()}
              value={query}
              onChange={(e) => setQueryAndReset(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Jump to…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Command palette search"
              role="combobox"
              aria-expanded
              aria-controls="command-palette-list"
              aria-activedescendant={filtered[activeIndex] ? `command-${filtered[activeIndex].id}` : undefined}
            />
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">Esc</kbd>
          </div>
          <ul id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matching destination.</li>
            ) : (
              filtered.map((c, i) => (
                <li key={c.id}>
                  <button
                    id={`command-${c.id}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    type="button"
                    onClick={() => go(c.to)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      i === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
                    )}
                  >
                    <c.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{c.label}</span>
                      {c.hint && <span className="block truncate text-xs text-muted-foreground">{c.hint}</span>}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
