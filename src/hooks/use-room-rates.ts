import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveDanceClasses } from '@/lib/api/danceClass';
import { mergeRoomRates, type RoomRateRow } from '@/lib/utils/roomRates';
import { parseApiError } from '@/lib/utils/errorUtils';

/** The admin Room rates table: every booking type, with its active rate if it has one. */
export function useRoomRates() {
  const [rows, setRows] = useState<RoomRateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Resetting the error as a request starts is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    getActiveDanceClasses()
      .then((rates) => {
        if (id === requestId.current) setRows(mergeRoomRates(rates));
      })
      .catch((e) => {
        if (id === requestId.current) setError(parseApiError(e));
      });
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { rows, error, reload };
}
