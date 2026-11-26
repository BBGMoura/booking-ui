import { useCallback, useEffect, useRef, useState } from 'react';
import { getStudioSettings } from '@/lib/api/settings';
import type { StudioSettings } from '@/lib/types/settings';
import { parseApiError } from '@/lib/utils/errorUtils';

/** The studio's settings for Admin › Settings. */
export function useStudioSettings() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Resetting the error as a request starts is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    getStudioSettings()
      .then((result) => {
        if (id === requestId.current) setSettings(result);
      })
      .catch((e) => {
        if (id === requestId.current) setError(parseApiError(e));
      });
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { settings, error, reload };
}
