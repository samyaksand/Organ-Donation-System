import { Outlet } from 'react-router-dom';
import { Footer } from '@/components/navigation/footer';
import { PublicNavbar } from '@/components/navigation/public-navbar';
import { SkipLink } from './skip-link';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <PublicNavbar />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
