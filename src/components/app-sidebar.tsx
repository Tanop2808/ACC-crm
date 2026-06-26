"use client"

import { useState, useEffect } from "react"
import { 
  Users, Settings, ShoppingBag, Layers, BarChart2, 
  Plug, FileText, LogOut, ShieldCheck, User 
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    // Read session state from localStorage bypass or Supabase Auth session
    const storedEmail = localStorage.getItem("session_email")
    const storedRole = localStorage.getItem("session_role")
    
    if (storedEmail) setEmail(storedEmail)
    if (storedRole) setRole(storedRole)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || null)
        // If logged in via standard Supabase but role isn't locally cached,
        // we fallback to local storage role or standard agent.
      }
    })
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("session_email")
    localStorage.removeItem("session_role")
    router.push("/login")
  }

  const isAdmin = role === "admin"

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarHeader className="h-14 flex items-center justify-center px-4 border-b border-border">
        <div className="font-extrabold text-xl tracking-tight text-foreground w-full flex items-center justify-between">
          <span>Datastraw <span className="text-primary text-2xl leading-none ml-[2px]">/</span></span>
          {role && (
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {role}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card">
        {/* Telemetry Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mt-4 mb-2">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    render={<Link href="/customers" className="flex items-center gap-3" />} 
                    isActive={pathname === "/customers"}
                  >
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Customers</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  render={<Link href="/agent/recovery" className="flex items-center gap-3" />} 
                  isActive={pathname === "/agent/recovery"}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span className="font-medium text-[13px]">Recovery Queue</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section (Only visible to Admins) */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mt-4 mb-2">
              Control Panel
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    render={<Link href="/admin" className="flex items-center gap-3" />} 
                    isActive={pathname === "/admin" || pathname.startsWith("/admin/brands")}
                  >
                    <Layers className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Brand Manager</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    render={<Link href="/integrations" className="flex items-center gap-3" />} 
                    isActive={pathname === "/integrations"}
                  >
                    <Plug className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Integrations</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    render={<Link href="/webhook-logs" className="flex items-center gap-3" />} 
                    isActive={pathname === "/webhook-logs"}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Webhook Terminal</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    render={<Link href="/agent-performance" className="flex items-center gap-3" />} 
                    isActive={pathname === "/agent-performance"}
                  >
                    <BarChart2 className="h-4 w-4" />
                    <span className="font-medium text-[13px]">Performance Leaderboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* System Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mt-4 mb-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  render={<Link href="/settings" className="flex items-center gap-3" />} 
                  isActive={pathname === "/settings"}
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium text-[13px]">Preferences</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer / Identity Card */}
      {email && (
        <SidebarFooter className="p-4 border-t border-border bg-muted/20">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {email.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-[12px] font-bold text-foreground truncate">{email.split("@")[0]}</span>
                <span className="text-[10px] text-muted-foreground truncate">{email}</span>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full h-8 rounded-md bg-secondary hover:bg-destructive/10 hover:text-destructive text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  )
}
