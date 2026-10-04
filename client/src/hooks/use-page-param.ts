import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps list filters + page in the URL query string so they survive reloads and
 * can be shared/bookmarked. Setting any filter resets the page to 1.
 */
export function useListParams<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = Object.fromEntries(keys.map((k) => [k, searchParams.get(k) ?? ''])) as Record<K, string>;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const setFilter = useCallback(
    (key: K, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextPage <= 1) next.delete('page');
        else next.set('page', String(nextPage));
        return next;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams],
  );

  const reset = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  return { values, page, setFilter, setPage, reset };
}
