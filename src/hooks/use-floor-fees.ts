import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveDanceClasses } from '@/lib/api/danceClass';
import { mergeFloorFees, type FloorFeeRow } from '@/lib/utils/floorFees';
import { parseApiError } from '@/lib/utils/errorUtils';

/** The admin Floor Fees list: every room-hire booking type, with its active floor fee if it has one. */
export function useFloorFees() {
  const [rows, setRows] = useState<FloorFeeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    // Resetting the error as a request starts is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    getActiveDanceClasses()
      .then((fees) => {
        if (id === requestId.current) setRows(mergeFloorFees(fees));
      })
      .catch((e) => {
        if (id === requestId.current) setError(parseApiError(e));
      });
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { rows, error, reload };
}
