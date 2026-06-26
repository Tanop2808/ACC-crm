"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem("session_email");
    if (!email) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          router.push("/login");
        } else {
          localStorage.setItem("session_email", session.user.email || "");
          if (session.user.email) {
            const cleanEmail = session.user.email.toLowerCase();
            (supabase as any).from("user_roles").select("role").eq("email", cleanEmail).maybeSingle().then(({ data }: any) => {
              if (data) localStorage.setItem("session_role", data.role);
              setIsCheckingAuth(false);
            });
          } else {
            setIsCheckingAuth(false);
          }
        }
      });
    } else {
      setIsCheckingAuth(false);
    }
  }, [router, pathname]);

  const isAssignedQueue = pathname === "/agent/recovery";

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="font-medium text-[13px]">Authenticating Operator...</p>
      </div>
    );
  }

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
