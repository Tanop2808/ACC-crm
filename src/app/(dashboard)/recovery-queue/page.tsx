import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhoneForwarded, Mail, Search, Grid, List, CheckCircle2, Phone, User, Settings, ArrowRight, MoreVertical } from "lucide-react";

export default function RecoveryQueuePage() {
  return (
    <div className="flex flex-col gap-8 pb-12 h-full">
      {/* Filter Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-3 shadow-sm border-border/40 bg-card rounded-xl">
        <div className="flex items-center gap-2">
          <Button className="h-9 px-4 font-bold rounded-lg text-[13px]">Today</Button>
          <Button variant="ghost" className="h-9 px-4 font-bold rounded-lg text-[13px] text-muted-foreground hover:text-foreground">Last 7 Days</Button>
          <Button variant="ghost" className="h-9 px-4 font-bold rounded-lg text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-2">
            High Value
            <span className="px-1.5 py-0.5 bg-[#FEF3C7] text-[#92400e] rounded text-[10px]">42</span>
          </Button>
          <Button variant="ghost" className="h-9 px-4 font-bold rounded-lg text-[13px] text-muted-foreground hover:text-foreground">No Contact</Button>
          <Button variant="ghost" className="h-9 px-4 font-bold rounded-lg text-[13px] text-muted-foreground hover:text-foreground">Follow Up Required</Button>
        </div>
        <div className="flex items-center gap-3 pr-2">
          <span className="text-muted-foreground font-medium text-[12px]">Displaying 1-8 of 142 tasks</span>
          <div className="flex border border-border rounded overflow-hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none bg-muted text-foreground"><Grid className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-muted-foreground"><List className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      {/* Priority Queue Header */}
      <div className="flex items-center justify-between border-l-4 border-primary pl-4 py-1">
        <div>
          <h2 className="text-[12px] font-bold text-foreground uppercase tracking-widest opacity-60 mb-1">Live Feed</h2>
          <h3 className="text-2xl font-extrabold text-foreground">Priority Recovery Queue</h3>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">TOTAL RECOVERY VALUE</p>
            <p className="text-[18px] font-extrabold text-primary">$42,910.00</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">RECOVERY RATE</p>
            <p className="text-[18px] font-extrabold text-primary">18.4%</p>
          </div>
        </div>
      </div>

      {/* Priority Grid (Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            tag: "HIGH VALUE", tagColor: "bg-destructive/10 text-destructive", time: "Abandoned 12m ago",
            name: "Eleanor J. Sterling", email: "eleanor.s@enterprise.com",
            val: "$1,240.00", items: "4",
            agent: "Agent: Marcus V.", initials: "MV", btnIcon: PhoneForwarded
          },
          {
            tag: "FOLLOW UP", tagColor: "bg-[#E0E7FF] text-primary", time: "Abandoned 2h ago",
            name: "Dante Rodriguez", email: "dante@techpulse.io",
            val: "$842.50", items: "2",
            agent: "Agent: Sarah K.", initials: "SK", btnIcon: Mail
          },
          {
            tag: "HIGH VALUE", tagColor: "bg-destructive/10 text-destructive", time: "Abandoned 54m ago",
            name: "Amara Okafor", email: "amara@designstudio.co",
            val: "$2,110.00", items: "1",
            agent: "Unassigned", initials: "UP", unassigned: true
          },
          {
            tag: "IN PROGRESS", tagColor: "bg-[#FEF3C7] text-[#92400e]", time: "Abandoned 4h ago",
            name: "Julian Vane", email: "julianv@logistics.net",
            val: "$650.00", items: "7",
            agent: "Agent: Leo G.", initials: "LG", btnIcon: Mail
          }
        ].map((card, i) => (
          <Card key={i} className="p-6 rounded-xl shadow-sm border-border hover:shadow-md transition-all relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-0.5 font-bold tracking-[0.12em] text-[10px] rounded-full uppercase ${card.tagColor}`}>{card.tag}</span>
              <span className="text-muted-foreground text-[12px]">{card.time}</span>
            </div>
            <div className="mb-5">
              <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Customer</p>
              <h4 className="text-[17px] font-bold text-foreground mt-0.5">{card.name}</h4>
              <p className="text-[12px] text-muted-foreground">{card.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5 border-y border-border/40 py-4 flex-1">
              <div>
                <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">CART VALUE</p>
                <p className="text-[15px] font-bold text-foreground mt-0.5">{card.val}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">ITEMS</p>
                <p className="text-[15px] font-bold text-foreground mt-0.5">{card.items}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${card.unassigned ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                  {card.initials}
                </div>
                <span className={`text-[12px] ${card.unassigned ? 'text-muted-foreground italic' : 'text-muted-foreground'}`}>{card.agent}</span>
              </div>
              {card.unassigned ? (
                <Button size="sm" className="h-7 px-3 text-[11px] font-bold rounded-lg">CLAIM</Button>
              ) : (
                <Button size="icon" className="h-8 w-8 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg shadow-none">
                  <card.btnIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Queue Table */}
      <Card className="rounded-xl shadow-sm border-border overflow-hidden flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="text-[17px] font-bold text-foreground">Standard Queue</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-[12px] text-muted-foreground">New Tasks (12)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#F59E0B] rounded-full"></span>
              <span className="text-[12px] text-muted-foreground">Pending Call (5)</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="px-6 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10">Customer Name</TableHead>
                <TableHead className="px-3 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10">Cart ID</TableHead>
                <TableHead className="px-3 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10">Value</TableHead>
                <TableHead className="px-3 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10">Last Action</TableHead>
                <TableHead className="px-3 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10">Abandoned</TableHead>
                <TableHead className="px-3 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10">Agent</TableHead>
                <TableHead className="px-6 py-3 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {[
                { name: "Benjamin Thorne", email: "b.thorne@gmail.com", id: "CRT-98210", val: "$412.00", action: "EMAIL SENT", aColor: "bg-[#DCFCE7]/60 text-[#047857]", time: "4h ago", agent: "Sarah K.", aInit: "SK" },
                { name: "Lydia Frost", email: "lfrost@outlook.com", id: "CRT-98192", val: "$189.50", action: "NO ACTION", aColor: "bg-[#E0E7FF]/60 text-primary", time: "6h ago", agent: "Queued", queued: true },
                { name: "Marcus Aurelius", email: "philosopher@stoic.co", id: "CRT-97554", val: "$55.00", action: "IN REVIEW", aColor: "bg-[#FEF3C7] text-[#92400e]", time: "8h ago", agent: "Marcus V.", aInit: "MV" },
                { name: "Zoe Henderson", email: "zoe.h@webmail.com", id: "CRT-98101", val: "$1,450.00", action: "CALL FAILED", aColor: "bg-destructive/10 text-[#991B1B]", time: "12h ago", agent: "Leo G.", aInit: "LG" },
              ].map((row, i) => (
                <TableRow key={i} className="hover:bg-muted/20 transition-colors h-14 border-border">
                  <TableCell className="px-6 py-2">
                    <p className="text-[14px] font-medium text-foreground">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-[12px] text-muted-foreground font-mono">{row.id}</TableCell>
                  <TableCell className="px-3 py-2 text-[14px] font-bold text-foreground">{row.val}</TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${row.aColor}`}>{row.action}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-[12px] text-muted-foreground">{row.time}</TableCell>
                  <TableCell className="px-3 py-2">
                    {row.queued ? (
                      <span className="text-[12px] italic text-muted-foreground">Queued</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">{row.aInit}</div>
                        <span className="text-[12px] text-foreground">{row.agent}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-muted/10">
          <Button variant="outline" size="sm" className="h-8 px-3 text-[12px] font-bold text-muted-foreground disabled:opacity-50" disabled>Previous</Button>
          <div className="flex gap-1">
            <Button size="icon" className="h-8 w-8 rounded text-[12px] font-bold">1</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded text-[12px] font-bold hover:bg-muted">2</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded text-[12px] font-bold hover:bg-muted">3</Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 px-3 text-[12px] font-bold text-muted-foreground hover:bg-muted">Next</Button>
        </div>
      </Card>
    </div>
  );
}
