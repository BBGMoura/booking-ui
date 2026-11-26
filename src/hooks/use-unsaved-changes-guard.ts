'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Warns before someone leaves a page with unsaved changes.
 *
 * Closing or reloading the tab gets the browser's own prompt; browsers don't let a page word it.
 * Clicking a link inside the app is held back instead, and `pendingHref` is set so the page can
 * ask in its own dialog. The App Router has no way to block a navigation once it has started, so
 * links are caught at the click, before Next's `<Link>` handles it.
 *
 * The browser's back and forward buttons aren't caught.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Older browsers only show the prompt when returnValue is set.
      event.returnValue = '';
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      // Ctrl/Cmd/Shift-click opens a new tab or window, so this page stays put.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    // Capture phase on the document runs before React's own listeners, so `<Link>` never sees it.
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty]);

  return {
    pendingHref,
    /** Goes where the held-back link pointed, dropping the unsaved changes. */
    leave() {
      if (pendingHref) router.push(pendingHref);
      setPendingHref(null);
    },
    stay() {
      setPendingHref(null);
    },
  };
}
