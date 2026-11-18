import { CalendarController } from '@fullcalendar/react';
import { EventCalendarNextIcon, EventCalendarPrevIcon } from '@/components/event-calendar-icons';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface EventCalendarToolbarProps {
  className?: string;
  controller: CalendarController;
  availableViews: string[];
  addButton?: {
    isPrimary?: boolean;
    text?: string;
    hint?: string;
    click?: (ev: MouseEvent) => void;
  };
}

export function EventCalendarToolbar({
  className,
  controller,
  availableViews,
  addButton,
}: EventCalendarToolbarProps) {
  const buttons = controller.getButtonState();

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {addButton && (
          <Button onClick={addButton.click as any} aria-label={addButton.hint}>
            {addButton.text}
          </Button>
        )}
        <Button
          onClick={() => controller.today()}
          aria-label={buttons.today.hint}
          variant="outline"
        >
          {buttons.today.text}
        </Button>
        <ButtonGroup>
          <Button
            onClick={() => controller.prev()}
            disabled={buttons.prev.isDisabled}
            aria-label={buttons.prev.hint}
            variant="outline"
            size="icon"
          >
            <EventCalendarPrevIcon />
          </Button>
          <Button
            onClick={() => controller.next()}
            disabled={buttons.next.isDisabled}
            aria-label={buttons.next.hint}
            variant="outline"
            size="icon"
          >
            <EventCalendarNextIcon />
          </Button>
        </ButtonGroup>
        <div className="text-xl font-semibold tracking-tight sm:text-2xl">
          {controller.view?.title}
        </div>
      </div>
      <Tabs value={controller.view?.type ?? availableViews[0]}>
        <TabsList className="gap-1 bg-transparent p-0">
          {availableViews.map((availableView) => (
            <TabsTrigger
              key={availableView}
              value={availableView}
              onClick={() => controller.changeView(availableView)}
              aria-label={buttons[availableView]?.hint}
              className="data-[state=active]:bg-muted dark:data-[state=active]:bg-muted px-3 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none dark:data-[state=active]:border-transparent"
            >
              {buttons[availableView]?.text}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
