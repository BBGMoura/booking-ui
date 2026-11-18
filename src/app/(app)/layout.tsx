import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // On screens big enough for it, the layout is locked to the viewport and
    // the page area scrolls under the header, so a page can fill the remaining
    // height with flex-1 instead of subtracting the header and padding itself.
    // Phones keep normal document scrolling. The breakpoint is the
    // `fixed-layout` variant in globals.css.
    <SidebarProvider className="fixed-layout:h-svh">
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <div className="fixed-layout:min-h-0 fixed-layout:overflow-y-auto flex flex-1 flex-col gap-4 p-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
