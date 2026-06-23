"use client"
import { LayoutDashboard, Users, ShoppingCart, Truck, Clock, ShoppingBag, BarChart2, Plug, FileText, Settings, CalendarCheck } from "lucide-react"
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
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { title: "Dashboard", url: "/agent/dashboard", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Assigned Carts", url: "/agent/recovery", icon: ShoppingBag },
  { title: "Follow-Ups", url: "/agent/follow-ups", icon: CalendarCheck },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarHeader className="h-14 flex items-center justify-center px-4 border-b border-border">
        <div className="font-extrabold text-xl tracking-tight text-foreground w-full flex items-center">
          Datastraw <span className="text-primary text-2xl leading-none ml-[2px]">/</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-card">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mt-4 mb-2">Telemetry</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.slice(0, 4).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<Link href={item.url} className="flex items-center gap-3" />} isActive={pathname === item.url}>
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium text-[13px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mt-4 mb-2">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.slice(4).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<Link href={item.url} className="flex items-center gap-3" />} isActive={pathname === item.url}>
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium text-[13px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
