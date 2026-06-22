import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, PhoneCall, Clock, CheckCircle2, Phone, Play, Eye, Users } from "lucide-react";
import Link from "next/link";

export default function AgentDashboardPage() {
  return (
    <div className="flex flex-col gap-8 pb-12 h-full max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-extrabold text-primary tracking-tight">RecoveryControl</h2>
          <div className="h-6 w-px bg-border hidden md:block" />
          <div className="relative w-64 hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-9 bg-muted/50 border-none text-[13px] font-medium" placeholder="Search..." />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Recovered Today</p>
            <p className="text-[15px] font-extrabold text-[#166534]">₹8,500</p>
          </div>
          <div className="flex items-center gap-3 pl-6 border-l border-border">
            <div className="text-right">
              <p className="text-[14px] font-bold text-foreground">Good Morning, Michael 👋</p>
              <p className="text-[11px] text-muted-foreground">Level 2 Agent</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-[14px]">
              MT
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Welcome Card */}
      <Card className="bg-primary text-primary-foreground border-none shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <CardContent className="p-8">
          <h1 className="text-3xl font-extrabold mb-2">Hi Michael 👋</h1>
          <p className="text-[15px] font-medium opacity-90 mb-6">Ready to recover abandoned carts?</p>
          <div className="inline-flex items-center px-4 py-2 bg-black/20 rounded-lg backdrop-blur-sm">
            <span className="text-[13px] font-bold tracking-wide">Your performance today is <span className="text-green-300">Excellent</span>. Keep it up!</span>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Today's Metrics (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Today's Queue</p>
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><ShoppingCart className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">87</h3>
            <p className="text-[12px] text-muted-foreground mt-1 font-medium">Customers assigned</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-border border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Calls Completed</p>
              <div className="p-2 bg-muted rounded-lg text-muted-foreground"><PhoneCall className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">12</h3>
            <p className="text-[12px] text-muted-foreground mt-1 font-medium">Calls today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Pending Follow-Ups</p>
              <div className="p-2 bg-[#FEF3C7] rounded-lg text-[#92400e]"><Clock className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">15</h3>
            <p className="text-[12px] text-[#92400e] font-bold mt-1">Need callback</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Recovery Rate Today</p>
              <div className="p-2 bg-[#DCFCE7] rounded-lg text-[#166534]"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">16.6%</h3>
            <p className="text-[12px] text-muted-foreground mt-1 font-medium">Converted carts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 3: Today's Queue Preview */}
        <Card className="lg:col-span-2 shadow-sm border-border flex flex-col">
          <CardHeader className="px-6 py-5 border-b border-border bg-muted/20">
            <CardTitle className="text-[16px] font-bold text-foreground">Today's Recovery Queue</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-6 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Customer</TableHead>
                  <TableHead className="h-10 px-6 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Cart Value</TableHead>
                  <TableHead className="h-10 px-6 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Priority</TableHead>
                  <TableHead className="h-10 px-6 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="h-10 px-6 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Michael Torres", val: "₹4500", priority: "High", pColor: "bg-destructive/10 text-destructive", status: "Pending" },
                  { name: "Sarah Jenkins", val: "₹1200", priority: "Medium", pColor: "bg-[#FEF3C7] text-[#92400e]", status: "Pending" },
                  { name: "Rahul Sharma", val: "₹8500", priority: "High", pColor: "bg-destructive/10 text-destructive", status: "In Progress" },
                  { name: "Deepika Kedia", val: "₹340", priority: "Low", pColor: "bg-muted text-muted-foreground", status: "Pending" },
                ].map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 h-16 border-border">
                    <TableCell className="px-6 font-bold text-[14px] text-foreground">{row.name}</TableCell>
                    <TableCell className="px-6 font-bold text-[14px] text-foreground">{row.val}</TableCell>
                    <TableCell className="px-6">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${row.pColor}`}>{row.priority}</span>
                    </TableCell>
                    <TableCell className="px-6 text-[13px] font-medium text-muted-foreground">{row.status}</TableCell>
                    <TableCell className="px-6 text-right">
                      <Button size="sm" className="h-8 px-3 font-bold text-[11px] rounded bg-primary/10 hover:bg-primary/20 text-primary shadow-none">
                        <Phone className="w-3 h-3 mr-1.5" /> Start Call
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-border flex justify-center bg-muted/10 mt-auto">
            <Button variant="link" className="font-bold text-[13px] text-primary">View Full Queue</Button>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Section 4: Recent Activity */}
          <Card className="shadow-sm border-border flex-1">
            <CardHeader className="px-6 py-5 border-b border-border bg-muted/20">
              <CardTitle className="text-[16px] font-bold text-foreground">Recent Calls</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="p-5 flex gap-4 items-start hover:bg-muted/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0 mt-0.5 border border-[#166534]/20">
                    <CheckCircle2 className="w-4 h-4 text-[#166534]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-foreground">Rahul Sharma</p>
                    <p className="text-[12px] font-medium text-[#166534] mt-0.5">Converted</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">10 minutes ago</p>
                  </div>
                </div>
                
                <div className="p-5 flex gap-4 items-start hover:bg-muted/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-foreground">Deepika Kedia</p>
                    <p className="text-[12px] font-medium text-primary mt-0.5">Follow-up scheduled</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">25 minutes ago</p>
                  </div>
                </div>

                <div className="p-5 flex gap-4 items-start hover:bg-muted/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5 border border-destructive/20">
                    <Phone className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-foreground">Amit Patel</p>
                    <p className="text-[12px] font-medium text-destructive mt-0.5">Not Interested</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">1 hour ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Quick Actions */}
          <Card className="shadow-sm border-border bg-muted/10">
            <CardHeader className="px-6 py-4 pb-2 border-b border-border/0">
              <CardTitle className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <Button className="w-full justify-start h-12 font-bold text-[14px] shadow-sm">
                <Play className="w-4 h-4 mr-3" /> Start Recovery Queue
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 font-bold text-[14px] bg-card hover:bg-muted/50">
                <Clock className="w-4 h-4 mr-3 text-muted-foreground" /> View Follow Ups
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 font-bold text-[14px] bg-card hover:bg-muted/50">
                <Users className="w-4 h-4 mr-3 text-muted-foreground" /> Customer Search
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
