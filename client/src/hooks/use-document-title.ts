import { useEffect } from 'react';

const APP_NAME = 'Organ Donation System';

/** Sets a descriptive <title> per page (announced by screen readers on navigation). */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
