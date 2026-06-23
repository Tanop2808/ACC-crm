"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Search, CalendarCheck, Clock, CheckCircle2, AlertCircle, CalendarDays, User, MapPin, ShoppingCart, MessageCircle, PhoneCall, XCircle, Loader2 } from "lucide-react";
import { getFollowUps, getAgents, getFollowUpDetails, TEMP_LOGGED_IN_AGENT_ID } from "@/services/agentRecoveryService";

export default function FollowUpsPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(TEMP_LOGGED_IN_AGENT_ID);
  const [followUpsData, setFollowUpsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const { data: agentsData } = await getAgents();
      if (agentsData) setAgents(agentsData);

      const { data } = await getFollowUps(activeAgentId);
      if (data) {
        const mapped = data.map(c => {
          const day = (c.attempts || 0) + 1;
          const status = c.current_status === 'follow_up' ? 'Pending' : (c.current_status || 'Pending');
          const isOverdue = c.follow_up_at && new Date(c.follow_up_at) < new Date() && status !== 'converted';
          let displayStatus = status;
          if (isOverdue) displayStatus = 'Overdue';

          let sColor = "bg-[#FEF3C7] text-[#92400e]";
          if (displayStatus === 'Overdue') sColor = "bg-destructive/10 text-destructive";
          if (status === 'converted' || status === 'Completed') {
            displayStatus = 'Completed';
            sColor = "bg-[#DCFCE7] text-[#166534]";
          }

          return {
            ...c,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
            val: `₹${(c.cart_value || 0).toLocaleString()}`,
            day: day,
            lastAction: c.notes || 'Cart Abandoned',
            nextAction: isOverdue ? 'Action Required' : 'Follow Up',
            status: displayStatus,
            sColor: sColor
          };
        });
        setFollowUpsData(mapped);
      }
      setIsLoading(false);
    }
    load();
  }, [activeAgentId]);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedCustomer?.cart_id) {
        setSelectedCustomerDetails(null);
        return;
      }
      setIsLoadingDetails(true);
      const { data } = await getFollowUpDetails(selectedCustomer.cart_id);
      if (data) {
        data.day = (data.attempts || 0) + 1;
        data.name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown';
        data.val = `₹${(data.cart_value || 0).toLocaleString()}`;
        setSelectedCustomerDetails(data);
      }
      setIsLoadingDetails(false);
    }
    loadDetails();
  }, [selectedCustomer]);

  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recovery Follow-Up Queue</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Manage the 3-Day recovery sequence for abandoned carts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={activeAgentId} onValueChange={setActiveAgentId}>
            <SelectTrigger className="h-10 border-slate-200 bg-white text-[13px] font-bold text-slate-700 w-[180px] shadow-sm">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents (Admin)</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <h3 className="text-3xl font-extrabold text-foreground">{followUpsData.length}</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Pending Follow-Ups</p>
              <div className="p-2 bg-[#FEF3C7] rounded-lg text-[#92400e]"><Clock className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">{followUpsData.filter(f => f.status === 'Pending').length}</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Completed Today</p>
              <div className="p-2 bg-[#DCFCE7] rounded-lg text-[#166534]"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground">{followUpsData.filter(f => f.status === 'Completed').length}</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Overdue</p>
              <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><AlertCircle className="w-4 h-4" /></div>
            </div>
            <h3 className="text-3xl font-extrabold text-destructive">{followUpsData.filter(f => f.status === 'Overdue').length}</h3>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading follow ups...</p>
                  </TableCell>
                </TableRow>
              ) : followUpsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center font-medium text-muted-foreground">
                    No follow-ups found.
                  </TableCell>
                </TableRow>
              ) : (
                followUpsData.map((row, i) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Recovery Workspace Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="w-[95vw] sm:max-w-7xl lg:max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-border bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center justify-between">
              Recovery Sequence: {selectedCustomerDetails?.name || selectedCustomer?.name}
              <Badge variant="outline" className="bg-[#E0E7FF] text-[#1e40af] border-[#1e40af]/20 ml-3">Day {selectedCustomerDetails?.day || selectedCustomer?.day}</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col lg:flex-row h-full overflow-hidden relative">
            {isLoadingDetails && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            
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
                        <h2 className="text-xl font-extrabold text-foreground">{selectedCustomerDetails?.name}</h2>
                        <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {selectedCustomerDetails?.address1 || selectedCustomerDetails?.city || 'Address not provided'}
                        </p>
                        <p className="text-[13px] font-bold text-foreground mt-3">{selectedCustomerDetails?.phone || '+91 -'}</p>
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
                  <CardContent className="p-4 flex flex-col gap-2 bg-muted/10 h-[100px] overflow-y-auto">
                    {selectedCustomerDetails?.products && selectedCustomerDetails.products.length > 0 ? (
                      selectedCustomerDetails.products.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between items-center w-full">
                          <p className="text-[13px] font-bold text-foreground truncate max-w-[70%]">{p.product_name || p.name}</p>
                          <p className="text-[12px] font-extrabold text-[#166534]">Qty: {p.quantity || 1}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No product details found.</p>
                    )}
                  </CardContent>
                  <div className="px-4 py-3 border-t border-border flex justify-between items-center bg-card">
                    <p className="text-[13px] font-bold text-muted-foreground">Total Cart Value</p>
                    <p className="text-[16px] font-extrabold text-[#166534]">{selectedCustomerDetails?.val}</p>
                  </div>
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
                    
                    {selectedCustomerDetails?.recovery_timeline && selectedCustomerDetails.recovery_timeline.length > 0 ? (
                      selectedCustomerDetails.recovery_timeline.map((event: any, i: number) => (
                        <div key={i} className="relative pl-6">
                          <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full -left-[9px] top-1" />
                          <div className="flex flex-col gap-1">
                            <p className="text-[13px] font-bold text-foreground">{event.activity_type.replace(/_/g, ' ')}</p>
                            <p className="text-[12px] text-muted-foreground">{event.description}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{new Date(event.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="relative pl-6">
                        <div className="absolute w-4 h-4 bg-background border-2 border-muted rounded-full -left-[9px] top-1" />
                        <p className="text-[13px] font-medium text-muted-foreground">No recovery actions recorded yet.</p>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right: Dynamic Action Panel based on Recovery Day */}
            <div className="w-full lg:w-[450px] border-l border-border bg-card flex flex-col shrink-0 h-full">
              
              {/* Day 1 & Day 2 Layout (Calls) */}
              {(!selectedCustomerDetails?.day || selectedCustomerDetails.day === 1 || selectedCustomerDetails.day === 2) && (
                <>
                  <div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
                    <h3 className="text-[15px] font-bold text-foreground">Day {selectedCustomerDetails?.day || 1} Recovery</h3>
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
                          <SelectItem value="no_answer" className="font-bold text-destructive">No Answer (Move to Day {(selectedCustomerDetails?.day || 1) + 1})</SelectItem>
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
              {selectedCustomerDetails?.day >= 3 && (
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
                        <p>Hi {selectedCustomerDetails?.first_name || selectedCustomer?.name?.split(' ')[0] || 'Customer'},</p>
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
