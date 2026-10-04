import { LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/features/auth/hooks';
import { displayNameOf, homePathFor } from '@/features/auth/session';
import { initials } from '@/lib/format';
import type { SessionUser } from '@/types/api';

export function UserMenu({ user }: { user: SessionUser }) {
  const logout = useLogout();
  const navigate = useNavigate();
  const name = displayNameOf(user);

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      toast.success('You have been signed out');
      navigate('/', { replace: true });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Account menu for ${name}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(name)}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          {user.donor && <span className="block text-xs text-muted-foreground">Donor ID {user.donor.donorCode}</span>}
          {user.role === 'ADMIN' && <span className="block text-xs text-muted-foreground">Administrator</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(homePathFor(user.role))}>
          <LayoutDashboard aria-hidden="true" /> Dashboard
        </DropdownMenuItem>
        {user.role === 'DONOR' && (
          <DropdownMenuItem onSelect={() => navigate('/donor/profile')}>
            <UserRound aria-hidden="true" /> My profile
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onLogout()} disabled={logout.isPending}>
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
