import type { LucideIcon } from 'lucide-react';
import { ExternalLink, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from '@/components/common/logo';
import { UserMenu } from '@/components/navigation/user-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/features/auth/hooks';
import { cn } from '@/lib/utils';
import { SkipLink } from './skip-link';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

interface DashboardLayoutProps {
  title: string;
  home: string;
  nav: NavItem[];
}

function SidebarNav({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {nav.map(({ to, label, icon: Icon, end, badge }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/80 hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning">
                {badge}
                <span className="sr-only"> pending</span>
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Shell for the donor portal and the admin console: fixed sidebar on desktop, sheet on mobile. */
export function DashboardLayout({ title, home, nav }: DashboardLayoutProps) {
  const { data: user } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Logo to={home} />
        </div>
        <nav aria-label={title} className="flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <SidebarNav nav={nav} />
        </nav>
        <div className="border-t p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Public site
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
              </SheetHeader>
              <nav aria-label={`${title} (mobile)`} className="px-3">
                <SidebarNav nav={nav} onNavigate={() => setOpen(false)} />
              </nav>
              <div className="mt-auto border-t p-3">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> Public site
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Logo to={home} compact />
          </div>
          <p className="hidden text-sm font-medium text-muted-foreground lg:block">{title}</p>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {user && <UserMenu user={user} />}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
