'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BookingSurfaceProps {
  /** A panel beside the calendar on wide screens, a dialog otherwise. */
  sidePanel: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Where the booking form and its confirmation show. Its children must lay
 * themselves out as a flex column that scrolls inside (as the form does), since
 * this gives them a bounded height.
 */
export function BookingSurface({
  sidePanel,
  title,
  description,
  onClose,
  children,
}: BookingSurfaceProps) {
  if (sidePanel) {
    return (
      <SidePanel title={title} description={description} onClose={onClose}>
        {children}
      </SidePanel>
    );
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* As wide as the screen on phones, centred like any other dialog. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col max-sm:max-w-none max-sm:border-x-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Phones need the room for the form itself. */}
          <DialogDescription className="sr-only sm:not-sr-only">{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Not a dialog: the calendar beside it stays usable. It still behaves like one
 * for the keyboard, moving focus in when it opens, closing on Escape and
 * handing focus back when it closes.
 */
function SidePanel({
  title,
  description,
  onClose,
  children,
}: Omit<BookingSurfaceProps, 'sidePanel'>) {
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    return () => opener?.focus();
  }, []);

  // Selects and the date picker render outside the panel, so Escape there
  // closes them, not the panel.
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && panel.current?.contains(event.target as Node)) onClose();
  };

  return (
    <aside
      ref={panel}
      aria-labelledby="booking-surface-title"
      onKeyDown={handleKeyDown}
      className="bg-card flex w-96 shrink-0 flex-col rounded-2xl border p-6 shadow-sm"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2
            ref={heading}
            id="booking-surface-title"
            tabIndex={-1}
            className="text-lg leading-none font-semibold outline-none"
          >
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mt-2 -mr-2"
          aria-label="Close"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      {children}
    </aside>
  );
}
