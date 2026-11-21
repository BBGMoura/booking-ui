import { useCallback, useEffect, useRef, useState } from 'react';
import { getUser } from '@/lib/api/user';
import type { UserProfile } from '@/lib/types/user';
import { getApiErrorInfo, parseApiError } from '@/lib/utils/errorUtils';

/** One user for the admin's user details page. */
export function useAdminUser(userUid: string) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Resetting the error as a request starts is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    getUser(userUid)
      .then((result) => {
        if (id !== requestId.current) return;
        setUser(result);
        setNotFound(false);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        // 400 is a uid that isn't a UUID at all, so it can't be anyone either.
        const { status } = getApiErrorInfo(e);
        if (status === 404 || status === 400) setNotFound(true);
        else setError(parseApiError(e));
      });
  }, [userUid, attempt]);

  // Keeps showing the current details while they reload, so the page doesn't flash.
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { user, error, notFound, reload };
}
