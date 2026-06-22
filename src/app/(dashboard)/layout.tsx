"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAssignedQueue = pathname === "/agent/recovery";

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        {!isAssignedQueue && (
          <header className="h-14 border-b border-border flex items-center px-4 bg-card shrink-0">
            <SidebarTrigger className="mr-4" />
            <div className="font-semibold text-[13px] tracking-wide text-muted-foreground uppercase">Control Room Console</div>
          </header>
        )}
        
        {isAssignedQueue && (
          <div className="absolute top-6 left-4 md:left-6 z-50">
            <SidebarTrigger />
          </div>
        )}

        <div className="flex-1 p-4 md:p-6 max-w-[1800px] w-full mx-auto">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
