"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Search, Phone, Mail, MapPin, ShoppingCart, Clock, CheckCircle2, User, PhoneCall, AlertCircle, Save, ExternalLink, Calendar, CalendarCheck, FileText, CheckCircle } from "lucide-react";

export default function RecoveryWorkspacePage() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const queueData = [
    { name: "Deepika Kedia", val: "₹8,900", priority: "High", pColor: "bg-destructive/10 text-destructive", status: "Follow Up", sColor: "bg-[#E0E7FF] text-[#1e40af]", time: "2 hours ago" },
    { name: "Michael Torres", val: "₹24,500", priority: "High", pColor: "bg-destructive/10 text-destructive", status: "Pending", sColor: "bg-muted text-muted-foreground", time: "10 mins ago" },
    { name: "Sarah Jenkins", val: "₹1,200", priority: "Low", pColor: "bg-muted text-muted-foreground", status: "Pending", sColor: "bg-muted text-muted-foreground", time: "1 hour ago" },
    { name: "Rahul Sharma", val: "₹4,500", priority: "Medium", pColor: "bg-[#FEF3C7] text-[#92400e]", status: "Pending", sColor: "bg-muted text-muted-foreground", time: "3 hours ago" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12 h-full w-full mx-auto">
      {/* Top Bar replacing layout header */}
      <div className="-mt-4 -mx-4 md:-mt-6 md:-mx-6 mb-2 border-b border-border bg-[#F8FAFC] px-6 py-5 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-8 md:pl-10">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">Assigned Queue</h1>
            <p className="text-[14px] font-medium text-muted-foreground mt-0.5">Select a customer below to open their recovery workspace.</p>
          </div>
          <div className="flex items-center">
            <span className="bg-[#E0E7FF] text-[#3b82f6] font-bold h-8 px-4 rounded-full text-[13px] flex items-center justify-center">87 Customers</span>
          </div>
        </div>

        <div className="pl-8 md:pl-10 w-full flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-[350px]">
            <div className="flex items-center bg-white border border-border focus-within:border-primary transition-all rounded-md px-3 h-10 w-full shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
              <input 
                className="bg-transparent border-none focus:ring-0 text-[13px] w-full outline-none font-medium placeholder:text-muted-foreground" 
                placeholder="Search customer, phone, or cart ID..." 
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select defaultValue="high_value">
              <SelectTrigger className="w-[150px] h-10 bg-white rounded-md border-border text-[13px] font-medium shadow-sm focus:ring-0">
                <SelectValue placeholder="Filter Queue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px] font-medium">All Customers</SelectItem>
                <SelectItem value="high_value" className="text-[13px] font-medium">High Value</SelectItem>
                <SelectItem value="pending" className="text-[13px] font-medium">Pending</SelectItem>
                <SelectItem value="follow_up" className="text-[13px] font-medium">Follow Up</SelectItem>
                <SelectItem value="recent" className="text-[13px] font-medium">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Priority</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Status</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Abandoned</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueData.map((row, i) => (
                <TableRow 
                  key={i} 
                  className="hover:bg-muted/30 border-border h-16 cursor-pointer"
                  onClick={() => setSelectedCustomer(row)}
                >
                  <TableCell className="px-6 font-bold text-[15px] text-foreground">{row.name}</TableCell>
                  <TableCell className="px-6 font-extrabold text-[15px] text-foreground">{row.val}</TableCell>
                  <TableCell className="px-6">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${row.pColor}`}>{row.priority}</span>
                  </TableCell>
                  <TableCell className="px-6">
                    <Badge variant="secondary" className={`text-[10px] uppercase tracking-widest ${row.sColor}`}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="px-6 text-[13px] font-medium text-muted-foreground flex items-center gap-1 mt-3">
                    <Clock className="w-3 h-3" /> {row.time}
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <Button variant="ghost" size="sm" className="font-bold text-primary hover:text-primary">
                      Open Workspace <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Customer Pop-up Workspace */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="w-[95vw] sm:max-w-7xl lg:max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-border bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center justify-between">
              Recovery Workspace: {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          
          {/* Inner 2-column layout inside the popup */}
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            
            {/* Left: Customer Data & Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-card">
              <Card className="shadow-sm border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-extrabold text-foreground">{selectedCustomer?.name}</h2>
                          <p className="text-[13px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" /> Mumbai, India
                          </p>
                        </div>
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> 2nd Abandonment
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Phone Number</p>
                            <p className="text-[14px] font-bold text-foreground">+91 98765 43210</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Email Address</p>
                            <p className="text-[14px] font-bold text-foreground">customer@example.com</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="px-6 py-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                  <CardTitle className="text-[15px] font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Abandoned Cart
                  </CardTitle>
                  <span className="text-[12px] font-mono text-muted-foreground">ID: CRT-88912A</span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    <div className="p-4 px-6 flex justify-between items-center hover:bg-muted/10 transition-colors">
                      <div>
                        <p className="text-[14px] font-bold text-foreground">iPhone 15 Pro Leather Cover</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">Quantity: 2</p>
                      </div>
                      <p className="text-[14px] font-bold text-foreground">₹7,000</p>
                    </div>
                  </div>
                  <div className="p-4 px-6 bg-muted/30 border-t border-border flex justify-between items-center">
                    <p className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">Total Cart Value</p>
                    <p className="text-[20px] font-extrabold text-[#166534]">{selectedCustomer?.val}</p>
                  </div>
                </CardContent>
              </Card>

              <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="timeline" className="border border-border bg-card shadow-sm rounded-xl overflow-hidden data-[state=closed]:border-border">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/10 transition-colors [&[data-state=open]]:border-b border-border">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                      <Clock className="w-4 h-4" /> Activity Timeline
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-card">
                    <div className="relative border-l-2 border-border ml-3 space-y-8 py-2">
                      <div className="relative pl-6">
                        <div className="absolute w-4 h-4 bg-background border-2 border-destructive rounded-full -left-[9px] top-1" />
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] font-bold text-foreground">Cart abandoned</p>
                          <p className="text-[11px] font-medium text-muted-foreground">Today, 10:30 AM</p>
                        </div>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full -left-[9px] top-1" />
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] font-bold text-foreground">Outbound Call (Michael)</p>
                          <p className="text-[11px] font-medium text-muted-foreground">Today, 11:15 AM</p>
                          <p className="text-[12px] text-muted-foreground mt-2 italic bg-muted/30 p-2 rounded">"Customer asked for more details on shipping times. Follow up requested."</p>
                          <Badge variant="outline" className="w-fit mt-2 bg-primary/10 text-primary border-primary/20">Interested</Badge>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="followup" className="border border-border bg-card shadow-sm rounded-xl overflow-hidden data-[state=closed]:border-border">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/10 transition-colors [&[data-state=open]]:border-b border-border">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                      <Calendar className="w-4 h-4" /> Upcoming Follow-Up
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 bg-card space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[14px] font-bold text-foreground">Scheduled Callback</p>
                        <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
                          <CalendarCheck className="w-3.5 h-3.5" /> Tomorrow at 4:30 PM (IST)
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-[#E0E7FF] text-[#1e40af] font-bold">High Priority</Badge>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> Notes</p>
                      <p className="text-[13px] text-foreground font-medium">Customer is deciding between the black and natural titanium cover. Call back after they finish work.</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 font-bold h-9">Reschedule</Button>
                      <Button variant="outline" size="sm" className="flex-1 font-bold h-9 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground shadow-none">Cancel</Button>
                      <Button size="sm" className="flex-1 font-bold h-9 bg-[#166534] hover:bg-[#166534]/90 text-white shadow-none"><CheckCircle className="w-4 h-4 mr-1.5"/> Complete</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Right: Interaction Log */}
            <div className="w-full lg:w-[450px] border-l border-border bg-card flex flex-col shrink-0 h-full">
              <div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
                <h3 className="text-[15px] font-bold text-foreground">Interaction Log</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">Log call outcome and schedule next steps.</p>
              </div>

              <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* 1. Outcome Selector */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Outcome</label>
                  <Select defaultValue="followup">
                    <SelectTrigger className="w-full h-11 font-bold text-[14px] bg-background border-border">
                      <SelectValue placeholder="Select Outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recovered" className="font-bold text-[#166534]">Recovered</SelectItem>
                      <SelectItem value="followup" className="font-bold text-primary">Follow Up</SelectItem>
                      <SelectItem value="not_interested" className="font-bold text-destructive">Not Interested</SelectItem>
                      <SelectItem value="no_response" className="font-bold">No Response</SelectItem>
                      <SelectItem value="wrong_number" className="font-bold">Wrong Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Interaction Notes */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Interaction Notes</label>
                  <Textarea 
                    className="w-full min-h-[120px] resize-none bg-background border-border font-medium text-[13px] p-4" 
                    placeholder="Enter details of the conversation..."
                  />
                </div>

                {/* 3. Follow-Up Section */}
                <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border">
                  <label className="text-[13px] font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Schedule Follow-Up
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground">Date</label>
                      <Input type="date" className="h-10 text-[13px] font-medium bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground">Time</label>
                      <Input type="time" className="h-10 text-[13px] font-medium bg-background border-border" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground">Reason</label>
                    <Input type="text" placeholder="e.g. Waiting for salary" className="h-10 text-[13px] font-medium bg-background border-border" />
                  </div>
                </div>
              </div>

              {/* 4. Primary Action Button */}
              <div className="p-6 border-t border-border bg-muted/10 shrink-0">
                <Button className="w-full h-12 text-[15px] font-extrabold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setSelectedCustomer(null)}>
                  <Save className="w-4 h-4 mr-2" /> Save Interaction
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
