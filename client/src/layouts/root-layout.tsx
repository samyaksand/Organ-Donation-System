import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { FullPageLoader } from '@/components/common/full-page-loader';

/** Scrolls to `#anchor` targets (e.g. /#how-it-works) after navigation. */
function HashScroller() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => window.clearTimeout(id);
  }, [hash, pathname]);
  return null;
}

export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <HashScroller />
      <Suspense fallback={<FullPageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
}
