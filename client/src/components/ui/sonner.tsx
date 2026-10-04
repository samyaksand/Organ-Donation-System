import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/components/theme/theme-provider';

/** App-wide toast outlet (sonner announces toasts through an ARIA live region). */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border shadow-lg',
          description: 'text-sm',
        },
      }}
    />
  );
}
