import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { CommandPalette } from '@/components/common/command-palette';
import { FullPageLoader } from '@/components/common/full-page-loader';
import { TooltipProvider } from '@/components/ui/tooltip';

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
    <TooltipProvider delayDuration={200}>
      <ScrollRestoration />
      <HashScroller />
      <CommandPalette />
      <Suspense fallback={<FullPageLoader />}>
        <Outlet />
      </Suspense>
    </TooltipProvider>
  );
}
