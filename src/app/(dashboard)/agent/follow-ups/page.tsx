"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Search, CalendarCheck, Clock, CheckCircle2, AlertCircle, CalendarDays, User, MapPin, ShoppingCart, MessageCircle, PhoneCall, XCircle } from "lucide-react";

export default function FollowUpsPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const followUpsData = [
    { name: "Deepika Kedia", val: "₹8,900", day: 2, lastAction: "Call Attempt (No Answer)", nextAction: "Call Attempt 2", status: "Pending", sColor: "bg-[#FEF3C7] text-[#92400e]" },
    { name: "Rahul Sharma", val: "₹4,500", day: 3, lastAction: "Call Attempt 2 (No Answer)", nextAction: "Send WhatsApp", status: "Pending", sColor: "bg-muted text-muted-foreground" },
    { name: "Sarah Jenkins", val: "₹1,200", day: 1, lastAction: "Cart Abandoned", nextAction: "Initial Call", status: "Overdue", sColor: "bg-destructive/10 text-destructive" },
    { name: "Michael Torres", val: "₹24,500", day: 3, lastAction: "WhatsApp Sent", nextAction: "Close Recovery", status: "Completed", sColor: "bg-[#DCFCE7] text-[#166534]" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recovery Follow-Up Queue</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Manage the 3-Day recovery sequence for abandoned carts.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Today's Follow-Ups</p>
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><CalendarDays className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">14</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Pending Follow-Ups</p>
              <div className="p-2 bg-[#FEF3C7] rounded-lg text-[#92400e]"><Clock className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">9</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Completed Today</p>
              <div className="p-2 bg-[#DCFCE7] rounded-lg text-[#166534]"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">5</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Overdue</p>
              <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><AlertCircle className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-destructive">2</h3>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search */}
        <div className="flex items-center bg-card border border-border focus-within:border-primary transition-all rounded-md px-3 h-10 w-full md:w-96">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input 
            className="bg-transparent border-none focus:ring-0 text-[13px] w-full outline-none font-medium placeholder:text-muted-foreground" 
            placeholder="Search customer, phone, or cart ID..." 
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-primary text-primary-foreground hover:bg-primary cursor-pointer px-3 py-1">Day 1</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted px-3 py-1">Day 2</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted px-3 py-1">Day 3</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted px-3 py-1">Completed</Badge>
        </div>
      </div>

      {/* Full Width Table */}
      <Card className="flex-1 shadow-sm overflow-hidden border-border flex flex-col">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Customer</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Cart Value</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Recovery Day</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Last Action</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Next Action</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Status</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followUpsData.map((row, i) => (
                <TableRow key={i} className="hover:bg-muted/30 border-border h-16 cursor-pointer" onClick={() => setSelectedCustomer(row)}>
                  <TableCell className="px-6 font-bold text-[15px] text-foreground">{row.name}</TableCell>
                  <TableCell className="px-6 font-extrabold text-[15px] text-foreground">{row.val}</TableCell>
                  <TableCell className="px-6">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded bg-[#E0E7FF] text-[#1e40af]">
                      Day {row.day}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 text-[13px] font-medium text-muted-foreground truncate">{row.lastAction}</TableCell>
                  <TableCell className="px-6 text-[13px] font-bold text-foreground">{row.nextAction}</TableCell>
                  <TableCell className="px-6">
                    <Badge variant="secondary" className={`text-[10px] uppercase tracking-widest ${row.sColor}`}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <Button size="sm" className="font-bold bg-primary/10 text-primary hover:bg-primary/20 shadow-none px-4">
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Recovery Workspace Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="w-[95vw] sm:max-w-7xl lg:max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-border bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center justify-between">
              Recovery Sequence: {selectedCustomer?.name}
              <Badge variant="outline" className="bg-[#E0E7FF] text-[#1e40af] border-[#1e40af]/20 ml-3">Day {selectedCustomer?.day}</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            
            {/* Left: Customer Data & Recovery Journey */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-card">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-extrabold text-foreground">{selectedCustomer?.name}</h2>
                        <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> Mumbai, India
                        </p>
                        <p className="text-[13px] font-bold text-foreground mt-3">+91 98765 43210</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-border bg-card">
                  <CardHeader className="px-6 py-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                    <CardTitle className="text-[14px] font-bold text-foreground flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Cart Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-between items-center bg-muted/10">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">iPhone 15 Pro Leather Cover (x2)</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">MagSafe Wireless Charger (x1)</p>
                    </div>
                    <p className="text-[18px] font-extrabold text-[#166534]">{selectedCustomer?.val}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recovery Journey Timeline */}
              <Card className="shadow-sm border-border bg-card flex-1">
                <CardHeader className="px-6 py-4 border-b border-border bg-muted/20">
                  <CardTitle className="text-[15px] font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Recovery Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative border-l-2 border-border ml-3 space-y-8 py-2">
                    
                    {/* Day 1 */}
                    <div className="relative pl-6">
                      <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full -left-[9px] top-1" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-bold text-foreground">Day 1: Call Attempt</p>
                        <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><AlertCircle className="w-3 h-3 text-destructive"/> No Answer</p>
                      </div>
                    </div>

                    {/* Day 2 */}
                    {selectedCustomer?.day >= 2 && (
                      <div className="relative pl-6">
                        <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full -left-[9px] top-1" />
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] font-bold text-foreground">Day 2: Call Attempt 2</p>
                          {selectedCustomer?.day > 2 ? (
                            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"><AlertCircle className="w-3 h-3 text-destructive"/> No Answer</p>
                          ) : (
                            <p className="text-[11px] font-medium text-primary animate-pulse">Pending</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Day 3 */}
                    {selectedCustomer?.day >= 3 && (
                      <div className="relative pl-6">
                        <div className="absolute w-4 h-4 bg-background border-2 border-[#166534] rounded-full -left-[9px] top-1" />
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] font-bold text-foreground">Day 3: WhatsApp Message</p>
                          <p className="text-[11px] font-medium text-primary animate-pulse">Ready to send</p>
                        </div>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right: Dynamic Action Panel based on Recovery Day */}
            <div className="w-full lg:w-[450px] border-l border-border bg-card flex flex-col shrink-0 h-full">
              
              {/* Day 1 & Day 2 Layout (Calls) */}
              {(selectedCustomer?.day === 1 || selectedCustomer?.day === 2) && (
                <>
                  <div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
                    <h3 className="text-[15px] font-bold text-foreground">Day {selectedCustomer?.day} Recovery</h3>
                    <p className="text-[13px] text-muted-foreground mt-0.5">Attempt to contact customer by phone.</p>
                  </div>
                  
                  <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar">
                    <Button className="w-full h-12 text-[15px] font-extrabold shadow-sm bg-[#166534] hover:bg-[#166534]/90 text-white">
                      <PhoneCall className="w-4 h-4 mr-2" /> Call Customer
                    </Button>

                    <div className="space-y-3 pt-4 border-t border-border">
                      <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Log Outcome</label>
                      <Select defaultValue="no_answer">
                        <SelectTrigger className="w-full h-11 font-bold text-[14px] bg-background border-border">
                          <SelectValue placeholder="Select Outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recovered" className="font-bold text-[#166534]">Recovered</SelectItem>
                          <SelectItem value="followup" className="font-bold text-primary">Schedule Custom Follow-Up</SelectItem>
                          <SelectItem value="no_answer" className="font-bold text-destructive">No Answer (Move to Day {selectedCustomer?.day + 1})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Interaction Notes</label>
                      <Textarea 
                        className="w-full min-h-[100px] resize-none bg-background border-border font-medium text-[13px] p-4" 
                        placeholder="Log details..."
                      />
                    </div>
                  </div>

                  <div className="p-6 border-t border-border bg-muted/10 shrink-0 flex gap-3">
                    <Button variant="outline" className="flex-1 h-12 text-[14px] font-bold border-border text-muted-foreground hover:bg-muted" onClick={() => setSelectedCustomer(null)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 h-12 text-[14px] font-bold bg-primary hover:bg-primary/90" onClick={() => setSelectedCustomer(null)}>
                      Save & Next
                    </Button>
                  </div>
                </>
              )}

              {/* Day 3 Layout (WhatsApp) */}
              {selectedCustomer?.day === 3 && (
                <>
                  <div className="px-6 py-5 border-b border-border bg-[#DCFCE7] shrink-0">
                    <h3 className="text-[15px] font-bold text-[#166534] flex items-center gap-2"><MessageCircle className="w-5 h-5"/> WhatsApp Recovery</h3>
                    <p className="text-[13px] text-[#166534]/80 mt-0.5 font-medium">Customer unreachable by phone. Send automated WhatsApp.</p>
                  </div>
                  
                  <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar bg-muted/10">
                    
                    {/* WhatsApp Preview Box */}
                    <div className="bg-white border border-[#25D366]/30 shadow-sm rounded-xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#25D366]"></div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#25D366] mb-3 flex items-center gap-1"><MessageCircle className="w-3 h-3"/> Message Preview</p>
                      
                      <div className="text-[14px] text-foreground font-medium leading-relaxed space-y-4">
                        <p>Hi {selectedCustomer.name.split(' ')[0]},</p>
                        <p>We noticed you left items in your cart.</p>
                        <p>Was there any issue during checkout?</p>
                        <div className="bg-muted p-3 rounded border border-border">
                          <p className="text-[12px] font-bold text-muted-foreground mb-1">Reply:</p>
                          <ul className="text-[13px] space-y-1">
                            <li>1 - Payment Issue</li>
                            <li>2 - Delivery Charges</li>
                            <li>3 - Need More Information</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full h-12 text-[15px] font-extrabold shadow-sm bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                      <MessageCircle className="w-5 h-5 mr-2" /> Send WhatsApp Message
                    </Button>

                  </div>

                  <div className="p-6 border-t border-border bg-white shrink-0 flex flex-col gap-3">
                    <Button className="w-full h-12 text-[14px] font-bold bg-primary hover:bg-primary/90" onClick={() => setSelectedCustomer(null)}>
                      Mark Recovered
                    </Button>
                    <Button variant="outline" className="w-full h-12 text-[14px] font-bold border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white" onClick={() => setSelectedCustomer(null)}>
                      <XCircle className="w-4 h-4 mr-2" /> Close Recovery (Unreachable)
                    </Button>
                  </div>
                </>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
