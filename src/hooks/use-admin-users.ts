import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getUsers } from '@/lib/api/user';
import type { Page } from '@/lib/types/booking';
import type { UserProfile } from '@/lib/types/user';
import { parseApiError } from '@/lib/utils/errorUtils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export const USERS_PAGE_SIZE = 10;
export const USER_SEARCH_DELAY_MS = 300;

/**
 * One page of users for the admin Users page, filtered by the search text.
 * The request waits for the admin to stop typing, and a new search starts on page 1.
 *
 * The search and page are kept in the URL (`?search=jane&page=2`), so coming
 * back from a user's details page, or reloading, shows the same list.
 */
export function useAdminUsers() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initial] = useState(() => readListQuery(searchParams));
  const [search, setSearch] = useState(initial.search);
  const debouncedSearch = useDebouncedValue(search.trim(), USER_SEARCH_DELAY_MS);
  // The page is remembered with the search it was chosen for, so a new search shows page 1.
  const [pageState, setPageState] = useState(initial);
  const pageIndex = pageState.search === debouncedSearch ? pageState.index : 0;
  const listQuery = toListQuery(debouncedSearch, pageIndex);

  useEffect(() => {
    if (listQuery === searchParams.toString()) return;
    router.replace(listQuery ? `${pathname}?${listQuery}` : pathname, { scroll: false });
  }, [listQuery, pathname, router, searchParams]);
  const [data, setData] = useState<Page<UserProfile> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Resetting loading/error as a request starts is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    getUsers({
      page: pageIndex,
      size: USERS_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(parseApiError(e));
        setLoading(false);
      });
  }, [debouncedSearch, pageIndex, attempt]);

  const setPageIndex = useCallback(
    (index: number) => setPageState({ search: debouncedSearch, index }),
    [debouncedSearch]
  );
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    listQuery,
    search,
    setSearch,
    activeSearch: debouncedSearch,
    data,
    error,
    loading,
    pageIndex,
    setPageIndex,
    reload,
  };
}

function readListQuery(params: URLSearchParams): { search: string; index: number } {
  const page = Number(params.get('page'));
  return {
    search: (params.get('search') ?? '').trim(),
    index: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  };
}

/** The list's search and page as a query string; empty for the first page of everyone. */
export function toListQuery(search: string, pageIndex: number): string {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (pageIndex > 0) query.set('page', String(pageIndex + 1));
  return query.toString();
}
