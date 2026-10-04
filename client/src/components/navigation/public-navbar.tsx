import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from '@/components/common/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { homePathFor } from '@/features/auth/session';
import { useSession } from '@/features/auth/hooks';
import { cn } from '@/lib/utils';
import { UserMenu } from './user-menu';

const links = [
  { to: '/organs', label: 'Organ availability' },
  { to: '/hospitals', label: 'Hospitals' },
  { to: '/#how-it-works', label: 'How it works' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  );

export function PublicNavbar() {
  const { data: user } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass} end>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden lg:inline-flex">
                <Link to="/login">Donor sign in</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Become a donor</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-3">
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} className={navLinkClass} onClick={() => setOpen(false)} end>
                    {l.label}
                  </NavLink>
                ))}
              </nav>
              <Separator />
              <div className="flex flex-col gap-2 px-4">
                {user ? (
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link to={homePathFor(user.role)}>Go to dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link to="/register">Become a donor</Link>
                    </Button>
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/login">Donor sign in</Link>
                    </Button>
                    <Button variant="ghost" asChild onClick={() => setOpen(false)}>
                      <Link to="/admin/login">Administrator sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
