import type * as React from 'react';
import { Logo } from '@/components/common/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Card } from '@/components/ui/card';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { cn } from '@/lib/utils';
import { SkipLink } from './skip-link';

interface AuthLayoutProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

/** Focused, distraction-free layout for sign-in and registration. */
export function AuthLayout({ title, description, children, footer, wide = false }: AuthLayoutProps) {
  useDocumentTitle(title);
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <SkipLink />
      <header className="container flex h-16 items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 focus:outline-none sm:pt-10">
        <div className={cn('w-full', wide ? 'max-w-3xl' : 'max-w-md')}>
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Card className="p-5 sm:p-8">{children}</Card>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
