import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Package, ArrowUpRight, MoreVertical, Filter } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Order Database</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Unified view of all successful checkouts and recovered orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 px-4 font-bold rounded-lg shadow-sm">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filter
          </Button>
          <Button className="h-10 px-4 font-bold rounded-lg shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "TOTAL ORDERS", value: "24,892", change: "+12.5%", cColor: "text-[#166534]", up: true },
          { label: "RECOVERED ORDERS", value: "1,244", change: "+18.2%", cColor: "text-primary", up: true },
          { label: "TOTAL REVENUE", value: "$1.42M", change: "+8.4%", cColor: "text-[#166534]", up: true },
          { label: "AOV (AVERAGE ORDER VALUE)", value: "$145.20", change: "-1.2%", cColor: "text-destructive", up: false },
        ].map((metric, i) => (
          <Card key={i} className={`shadow-sm border-border ${i === 1 ? 'border-l-4 border-l-primary' : ''}`}>
            <CardContent className="p-5">
              <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{metric.label}</p>
              <div className="flex items-end gap-3 mt-2">
                <h3 className="text-2xl font-extrabold text-foreground">{metric.value}</h3>
                <span className={`text-[12px] font-bold flex items-center mb-1 ${metric.cColor}`}>
                  {metric.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center bg-card border border-border focus-within:border-primary transition-all rounded-md px-3 h-10 w-full md:w-96">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          className="bg-transparent border-none focus:ring-0 text-[13px] w-full outline-none font-medium placeholder:text-muted-foreground" 
          placeholder="Search by Order ID, Customer, or Email..." 
        />
      </div>

      {/* Table */}
      <Card className="flex-1 shadow-sm overflow-hidden border-border flex flex-col">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Order ID</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Customer</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Date</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Source</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Total</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { id: "ORD-99120", customer: "Sarah Jenkins", email: "sarah.j@email.com", date: "Today, 14:22", source: "Organic", total: "$124.50", status: "Fulfilled", sColor: "bg-[#DCFCE7] text-[#166534]" },
                { id: "ORD-99119", customer: "Michael Chen", email: "mchen@startup.io", date: "Today, 13:45", source: "Recovery (Agent)", total: "$845.00", status: "Processing", sColor: "bg-primary/10 text-primary" },
                { id: "ORD-99118", customer: "Amanda Ross", email: "aross@gmail.com", date: "Today, 12:10", source: "Paid Social", total: "$42.00", status: "Fulfilled", sColor: "bg-[#DCFCE7] text-[#166534]" },
                { id: "ORD-99117", customer: "David Kim", email: "dkim99@yahoo.com", date: "Today, 11:05", source: "Recovery (SMS)", total: "$210.00", status: "Cancelled", sColor: "bg-destructive/10 text-destructive" },
                { id: "ORD-99116", customer: "Eleanor Shellstrop", email: "eleanor@goodplace.com", date: "Today, 09:30", source: "Organic", total: "$8,450.00", status: "Review", sColor: "bg-[#FEF3C7] text-[#92400e]" },
              ].map((row, i) => (
                <TableRow key={i} className="hover:bg-muted/30 border-border h-14">
                  <TableCell className="px-6 py-2 font-mono text-[13px] font-medium text-foreground">{row.id}</TableCell>
                  <TableCell className="px-6 py-2">
                    <p className="text-[14px] font-bold text-foreground">{row.customer}</p>
                    <p className="text-[12px] text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="px-6 py-2 text-[13px] text-muted-foreground">{row.date}</TableCell>
                  <TableCell className="px-6 py-2 text-[13px] font-medium text-foreground">{row.source}</TableCell>
                  <TableCell className="px-6 py-2 text-[14px] font-bold text-foreground">{row.total}</TableCell>
                  <TableCell className="px-6 py-2 text-right">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${row.sColor}`}>{row.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
