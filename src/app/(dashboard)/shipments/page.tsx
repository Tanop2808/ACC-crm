import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MapPin, Truck, ExternalLink, PackageCheck } from "lucide-react";

export default function ShipmentsPage() {
  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Shipment Tracking</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Live tracking and fulfillment status for all recovered orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 px-4 font-bold rounded-lg shadow-sm">
            Sync Carriers
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "IN TRANSIT", value: "842", change: "42 delayed", cColor: "text-destructive" },
          { label: "OUT FOR DELIVERY", value: "156", change: "Arriving today", cColor: "text-primary" },
          { label: "DELIVERED (7D)", value: "3,104", change: "98% on-time", cColor: "text-[#166534]" },
          { label: "EXCEPTIONS", value: "12", change: "Requires attention", cColor: "text-destructive" },
        ].map((metric, i) => (
          <Card key={i} className="shadow-sm border-border">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{metric.label}</p>
              <div className="flex items-end gap-3 mt-2">
                <h3 className="text-2xl font-extrabold text-foreground">{metric.value}</h3>
              </div>
              <p className={`text-[12px] font-bold mt-2 ${metric.cColor}`}>{metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center bg-card border border-border focus-within:border-primary transition-all rounded-md px-3 h-10 w-full md:w-96">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          className="bg-transparent border-none focus:ring-0 text-[13px] w-full outline-none font-medium placeholder:text-muted-foreground" 
          placeholder="Tracking Number, Order ID..." 
        />
      </div>

      {/* Table */}
      <Card className="flex-1 shadow-sm overflow-hidden border-border flex flex-col">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Tracking Details</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Carrier</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Destination</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Estimated Delivery</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { track: "FED-110293", id: "ORD-99120", carrier: "FedEx", dest: "Seattle, WA", est: "Tomorrow", status: "In Transit", sColor: "bg-primary/10 text-primary", icon: Truck },
                { track: "UPS-884192", id: "ORD-99119", carrier: "UPS", dest: "Austin, TX", est: "Today, by 8pm", status: "Out for Delivery", sColor: "bg-[#FEF3C7] text-[#92400e]", icon: MapPin },
                { track: "USPS-44910", id: "ORD-99118", carrier: "USPS", dest: "Brooklyn, NY", est: "Delivered", status: "Delivered", sColor: "bg-[#DCFCE7] text-[#166534]", icon: PackageCheck },
              ].map((row, i) => (
                <TableRow key={i} className="hover:bg-muted/30 border-border h-16">
                  <TableCell className="px-6 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        <row.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1">
                          {row.track} <ExternalLink className="w-3 h-3" />
                        </p>
                        <p className="text-[12px] text-muted-foreground font-mono">Ref: {row.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-2 text-[14px] font-bold text-foreground">{row.carrier}</TableCell>
                  <TableCell className="px-6 py-2 text-[14px] text-foreground">{row.dest}</TableCell>
                  <TableCell className="px-6 py-2 text-[14px] text-foreground font-medium">{row.est}</TableCell>
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
