import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // On screens big enough for it, the layout is locked to the viewport and
    // the page area scrolls under the header, so a page can fill the remaining
    // height with flex-1 instead of subtracting the header and padding itself.
    // Phones keep normal document scrolling. The media query is mirrored in
    // useFixedHeightLayout.
    <SidebarProvider className="[@media(min-width:768px)_and_(min-height:600px)]:h-svh">
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 p-10 [@media(min-width:768px)_and_(min-height:600px)]:min-h-0 [@media(min-width:768px)_and_(min-height:600px)]:overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
