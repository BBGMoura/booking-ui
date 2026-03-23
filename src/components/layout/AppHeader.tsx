'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { pageTitles } from '@/lib/config/nav';

export function AppHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Booking Portal';

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <span className="text-sm font-medium">{title}</span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
