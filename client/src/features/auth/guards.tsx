import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState } from '@/components/common/error-state';
import { FullPageLoader } from '@/components/common/full-page-loader';
import type { Role } from '@/types/api';
import { useSession } from './hooks';
import { homePathFor } from './session';

/** Protects a route subtree: unauthenticated -> login (with return path), wrong role -> own home. */
export function RequireRole({ allow }: { allow: Role }) {
  const { data: user, isPending, isError, error, refetch } = useSession();
  const location = useLocation();

  if (isPending) return <FullPageLoader label="Checking your session" />;
  if (isError) {
    return (
      <div className="container py-16">
        <ErrorState error={error} title="Could not verify your session" onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!user) {
    const loginPath = allow === 'ADMIN' ? '/admin/login' : '/login';
    return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== allow) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}

/** Login/register pages: signed-in users go straight to their portal. */
export function GuestOnly() {
  const { data: user, isPending } = useSession();
  if (isPending) return <FullPageLoader />;
  if (user) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
