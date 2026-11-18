import { useSyncExternalStore } from 'react';

// Must match the `fixed-layout` variant in `src/app/globals.css`. CSS can't read
// a JS constant, so the query lives in both places.
const FIXED_HEIGHT_LAYOUT_QUERY = '(min-width: 768px) and (min-height: 600px)';

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(FIXED_HEIGHT_LAYOUT_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

/**
 * Whether the app layout is locked to the viewport height, with the page area
 * scrolling inside it. On smaller screens (phones in either orientation) the
 * whole document scrolls instead.
 */
export function useFixedHeightLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(FIXED_HEIGHT_LAYOUT_QUERY).matches,
    () => false
  );
}
