"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, Bell, History, Mail, MessageSquare, PhoneOff, User, 
  ShoppingBag, Mic, MicOff, Send, CalendarPlus, CheckCircle2, Clock, AlertTriangle, PlayCircle, Sparkles, ChevronDown, PhoneCall, Loader2
} from "lucide-react";
import { getAssignedCarts, getCartTimeline, updateRecoveryStatus, addNote, updateStatusAndNote, scheduleFollowUp, getAgents, TEMP_LOGGED_IN_AGENT_ID, AssignedCart } from "@/services/agentRecoveryService";
import { supabase } from "@/lib/supabase";

export default function AssignedCartsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  
  const [agents, setAgents] = useState<any[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(TEMP_LOGGED_IN_AGENT_ID);
  
  const [customers, setCustomers] = useState<AssignedCart[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [quickNotes, setQuickNotes] = useState("");
  const [statusVal, setStatusVal] = useState("select");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    const { data: agentsData } = await getAgents();
    if (agentsData) setAgents(agentsData);

    const { data, error: fetchError } = await getAssignedCarts(activeAgentId);
    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setCustomers(data as AssignedCart[]);
      if (!selectedCartId) {
        const highValue = (data as AssignedCart[]).filter((c: any) => (c?.cart_value || 0) >= 5000);
        if (highValue.length > 0) {
          setSelectedCartId(highValue[0].cart_id);
        } else if (data.length > 0) {
          setSelectedCartId((data as any[])[0].cart_id);
        }
      }
    }
    setIsLoading(false);
  }

  async function loadTimeline(cartId: string) {
    const { data } = await getCartTimeline(cartId);
    if (data) setTimeline(data);
  }

  useEffect(() => {
    loadData();
  }, [activeAgentId]);

  useEffect(() => {
    const channel1 = supabase
      .channel('realtime-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_assignments' }, () => loadData())
      .subscribe();
      
    const channel2 = supabase
      .channel('realtime-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_recovery_status' }, () => loadData())
      .subscribe();

    const channelActivity = supabase
      .channel('realtime-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_activity' }, () => loadData())
      .subscribe();

    const channelActivityLogs = supabase
      .channel('realtime-activity-logs-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_activity_logs' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channelActivity);
      supabase.removeChannel(channelActivityLogs);
    };
  }, []);

  useEffect(() => {
    if (selectedCartId) {
      loadTimeline(selectedCartId);
    }
  }, [selectedCartId]);

  useEffect(() => {
    const channel3 = supabase
      .channel('realtime-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_activity_logs' }, () => {
        if (selectedCartId) loadTimeline(selectedCartId);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel3);
    };
  }, [selectedCartId]);

  async function handleSaveNext() {
    if (!selectedCustomer) return;
    
    setIsLoading(true);
    const hasStatus = statusVal !== 'select';
    const hasNote = quickNotes.trim().length > 0;

    if (hasStatus && hasNote) {
      await updateStatusAndNote(selectedCustomer.cart_id, selectedCustomer.assignment_id, selectedCustomer.agent_id, statusVal, selectedCustomer.current_status, quickNotes);
    } else if (hasStatus) {
      await updateRecoveryStatus(selectedCustomer.cart_id, selectedCustomer.assignment_id, selectedCustomer.agent_id, statusVal, selectedCustomer.current_status);
    } else if (hasNote) {
      await addNote(selectedCustomer.cart_id, selectedCustomer.assignment_id, selectedCustomer.agent_id, quickNotes);
    }
    
    setQuickNotes("");
    setStatusVal("select");
    await loadData();
    // Select next cart logic (simple version)
    const idx = filteredCustomers.findIndex(c => c.cart_id === selectedCustomer.cart_id);
    if (idx >= 0 && idx < filteredCustomers.length - 1) {
      setSelectedCartId(filteredCustomers[idx + 1].cart_id);
    }
    setIsLoading(false);
  }

  async function handleScheduleCallback() {
    if (!selectedCustomer) return;
    setIsLoading(true);
    // Setting for tomorrow same time roughly
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    await scheduleFollowUp(selectedCustomer.cart_id, selectedCustomer.assignment_id, selectedCustomer.agent_id, tmr.toISOString());
    await loadData();
    setIsLoading(false);
  }

  // Filtering
  const filteredCustomers = customers.filter(c => {
    // Search query
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      const matchesName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(sq);
      const matchesPhone = (c.phone || '').includes(sq);
      const matchesCart = (c.cart_id || '').toLowerCase().includes(sq);
      if (!matchesName && !matchesPhone && !matchesCart) return false;
    }

    // Tab filter
    if (activeTab === 'high_value') {
      return (c.cart_value || 0) >= 5000;
    }
    if (activeTab === 'follow_ups') {
      return c.follow_up || c.current_status === 'follow_up';
    }
    if (activeTab === 'pending') {
      return !c.follow_up && (c.current_status === 'Pending' || c.current_status === 'assigned' || c.current_status === null);
    }
    // recent
    return true; 
  });

  const selectedCustomer = filteredCustomers.find(c => c.cart_id === selectedCartId) || filteredCustomers[0];

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    let ds = dateStr;
    if (ds.includes(' ') && !ds.includes('T')) ds = ds.replace(' ', 'T');
    if (!ds.endsWith('Z') && !ds.match(/[+-]\d{2}:?\d{2}$/)) ds += 'Z';
    const date = new Date(ds);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const getProductsList = (productsJson: any) => {
    if (!productsJson) return [];
    try {
      if (typeof productsJson === 'string') return JSON.parse(productsJson);
      if (Array.isArray(productsJson)) return productsJson;
      return [];
    } catch (e) {
      return [];
    }
  };

  const formatCurrency = (val: any) => {
    if (!val) return '₹0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `₹${num.toLocaleString()}`;
  };

  const activeProducts = getProductsList(selectedCustomer?.products);

  const callRemarksLogs = [...timeline]
    .reverse()
    .filter(log => log.activity_type === 'NOTE_ADDED' || log.activity_type === 'STATUS_AND_NOTE');

  const getRemarkText = (log: any) => {
    if (log.activity_type === 'NOTE_ADDED') return log.description;
    if (log.activity_type === 'STATUS_AND_NOTE') {
      if (log.metadata?.note) return log.metadata.note;
      if (log.description && log.description.includes('. Note: ')) {
        return log.description.split('. Note: ')[1];
      }
      return log.description;
    }
    return null;
  };

  const remarksList = [
    callRemarksLogs[0] ? getRemarkText(callRemarksLogs[0]) : null,
    callRemarksLogs[1] ? getRemarkText(callRemarksLogs[1]) : null,
    callRemarksLogs[2] ? getRemarkText(callRemarksLogs[2]) : null,
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
          <p className="text-sm font-bold text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-sm border border-red-100">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Database Error</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <p className="text-xs text-slate-400">If you just created a new table, make sure Row Level Security (RLS) policies allow read access, or temporarily disable RLS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC] -m-4 md:-m-6">
      {/* Top Header */}
      <header className="h-16 shrink-0 bg-white border-b border-border flex items-center justify-between px-6 pl-14">
        <div className="flex items-center gap-6 flex-1">
          <div className="font-bold text-blue-700 text-lg tracking-tight">RecoveryControl</div>
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              className="pl-9 h-9 bg-muted/50 border-none text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-blue-500" 
              placeholder="Search cart ID, name, phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-8">

          <div className="flex items-center gap-3">
            {/* Agent Switcher */}
            <Select value={activeAgentId} onValueChange={(v) => setActiveAgentId(v as string)}>
              <SelectTrigger className="h-9 border-slate-200 bg-slate-50 text-[13px] font-bold text-slate-700 w-[140px] shadow-sm">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents (Admin)</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-8 h-8 rounded-full bg-slate-800 ml-2 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: Assigned Queue */}
        <div className="w-[320px] shrink-0 bg-white border-r border-border flex flex-col z-10">
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-[16px] text-slate-900 tracking-tight">Assigned Queue</h2>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[11px] font-bold hover:bg-slate-100">{filteredCustomers.length} Carts</Badge>
            </div>
            <div className="flex p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 overflow-x-auto custom-scrollbar mt-1">
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'high_value' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('high_value')}>High Value</button>
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('pending')}>Pending</button>
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'follow_ups' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('follow_ups')}>Follow Ups</button>
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'all' || activeTab === 'recent' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('all')}>All</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="text-center p-6 text-sm text-slate-500 font-medium">No carts found for this filter.</div>
            ) : (
              filteredCustomers.map((item, i) => {
                const isActive = item.cart_id === selectedCustomer?.cart_id;
                const status = item.current_status || 'assigned';
                const sColor = status === 'converted' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200';
                
                return (
                  <div 
                    key={i} 
                    onClick={() => setSelectedCartId(item.cart_id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${isActive ? 'border-blue-600 shadow-sm bg-[#F8FAFC]' : 'border-border bg-white hover:border-blue-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-[14px] text-slate-900">{`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown'}</span>
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 border ${sColor}`}>{status}</Badge>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[12px] text-slate-500 font-mono">Cart: {item.cart_id?.substring(0, 8)}</span>
                        {isActive && (
                          <span className="text-[12px] font-bold text-blue-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> 00:00 in call
                          </span>
                        )}
                        {(item.cart_value || 0) >= 5000 && !isActive && (
                          <span className="text-[11px] font-bold text-red-600 flex items-center gap-1.5 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> High Value Risk
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-[15px] text-slate-900">{formatCurrency(item.cart_value)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Column: Active Session */}
        {selectedCustomer ? (
          <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar p-8">
            <div className="mb-8">
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl flex flex-col">
                <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-100 bg-slate-50/50">
                  <User className="w-5 h-5 text-blue-700" />
                  <h3 className="font-bold text-[16px] text-slate-900">{`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'Unknown'}</h3>
                </div>
                <CardContent className="px-6 py-6 flex flex-col space-y-6 pt-6">
                  {/* Row 1: Email & Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</p>
                      <p className="text-[14px] font-bold text-slate-900 truncate" title={selectedCustomer.email || ''}>{selectedCustomer.email || 'N/A'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact Info</p>
                      <p className="text-[14px] font-bold text-slate-900">{selectedCustomer.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="min-w-0 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Address</p>
                    {selectedCustomer.address1 || selectedCustomer.city ? (
                      <div className="text-[13px] font-medium text-slate-900 leading-relaxed">
                        {selectedCustomer.address1 && <p>{selectedCustomer.address1}</p>}
                        {selectedCustomer.address2 && <p>{selectedCustomer.address2}</p>}
                        <p>{[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(', ')}</p>
                        <p>{[selectedCustomer.country, selectedCustomer.zip].filter(Boolean).join(' - ')}</p>
                      </div>
                    ) : (
                      <p className="text-[13px] font-medium text-slate-500">Address not available</p>
                    )}
                  </div>

                  {/* Order Details */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Cart Details</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-600">{selectedCustomer.cart_status || 'ABANDONED'}</Badge>
                          <span className="text-[11px] font-medium text-slate-400">Abandoned: {formatTimeAgo(selectedCustomer.abandoned_at)}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="font-extrabold text-[16px] text-slate-900">{formatCurrency(selectedCustomer.cart_value)}</span>
                      </div>
                    </div>

                    {selectedCustomer.checkout_url && (
                      <div className="mb-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Checkout URL</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#F8F9FA] border border-slate-100 rounded-lg px-3 py-2.5 overflow-hidden">
                            <p className="text-[13px] font-medium text-slate-600 truncate">{selectedCustomer.checkout_url}</p>
                          </div>
                          <Button 
                            onClick={() => navigator.clipboard.writeText(selectedCustomer.checkout_url)} 
                            className="bg-blue-700 hover:bg-blue-800 text-white text-[12px] h-10 px-4 rounded-lg font-bold shrink-0"
                          >
                            COPY URL
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {activeProducts.length > 0 ? (
                        activeProducts.map((p: any, i: number) => {
                          const img = p.image_url || p.imageUrl || p.image || p.img || p.thumbnail || p.src || p.picture;
                          const name = p.name || p.product_name || p.title || p.item_name || 'Unknown Product';
                          const qty = p.qty || p.quantity || 1;
                          
                          return (
                            <div key={i} className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                                {img ? (
                                  <img src={img} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag className="w-5 h-5 text-slate-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-[13px] font-bold text-slate-900 leading-tight mb-1">{name}</p>
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="bg-white text-slate-600 font-bold text-[10px] px-1.5 py-0 rounded border border-slate-200">Qty: {qty}</Badge>
                                  {(p.price || p.price === 0) && (
                                    <span className="text-[12px] font-extrabold text-slate-700">{formatCurrency(p.price)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] text-slate-500 font-medium">
                          No product details found
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Call Remarks */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Call Remarks</p>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((num, i) => {
                  const remark = remarksList[i];
                  const ordinal = num === 1 ? '1ST' : num === 2 ? '2ND' : '3RD';
                  return (
                    <div key={num} className="bg-[#F8F9FA] border border-slate-100 rounded-xl p-4 flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[11px] font-bold text-slate-600">{num}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{ordinal} Call Remarks</p>
                        {remark ? (
                          <p className="text-[14px] text-slate-700 font-medium">{remark}</p>
                        ) : (
                          <p className="text-[14px] text-slate-400 italic font-medium">No remarks recorded.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-500">
            <User className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">No customer selected.</p>
          </div>
        )}

        {/* Right Column: Call Controls & Logging */}
        <div className="w-[320px] lg:w-[350px] shrink-0 bg-white border-l border-border flex flex-col z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          
          <div className="p-6 pb-6 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-3">Call Controls</p>
            {isCalling ? (
              <div className="border border-blue-200 bg-[#F0F5FF] rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75"></div>
                    <Mic className="w-5 h-5 text-green-700 relative z-10" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[15px] text-slate-900">In Progress</p>
                    <p className="text-[14px] font-bold text-green-600 font-mono mt-0.5">00:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className={`rounded-full h-11 w-11 transition-colors ${isMuted ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700' : 'bg-white border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50'}`}
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    <MicOff className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="rounded-full h-11 w-11 shadow-sm bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setIsCalling(false)}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setIsCalling(true)}
                className="w-full h-14 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-[15px] shadow-sm rounded-xl flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-5 h-5" /> Call Customer
              </Button>
            )}
          </div>

          <div className="px-6 py-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-4">Log Outcome</p>
                
                <div className="space-y-5">
                  <div key="date-attempt-row" className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Date</label>
                      <Input 
                        type="date" 
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full h-11 bg-[#F8F9FA] border-slate-200 text-[13px] font-medium text-slate-900 shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Attempt</label>
                      <Select defaultValue="1st">
                        <SelectTrigger className="w-full !h-11 bg-[#F8F9FA] border-slate-200 text-[13px] font-medium text-slate-900 shadow-sm focus:ring-1 focus:ring-blue-500 rounded-lg">
                          <SelectValue placeholder="Select Attempt..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1st">1st</SelectItem>
                          <SelectItem value="2nd">2nd</SelectItem>
                          <SelectItem value="3rd">3rd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div key="call-status-row" className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Call Status</label>
                    <Select value={statusVal} onValueChange={(v) => setStatusVal(v as string)}>
                      <SelectTrigger className="w-full !h-11 bg-white border-slate-200 text-[13px] font-bold text-slate-900 shadow-sm focus:ring-1 focus:ring-blue-500 rounded-lg">
                        <SelectValue placeholder="Select Status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select" disabled>Select Status...</SelectItem>
                        <SelectItem value="connected">Connected</SelectItem>
                        <SelectItem value="no_answer">No Answer</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="disconnected">Disconnected</SelectItem>
                        <SelectItem value="wrong_number">Wrong Number</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="dnd">DND</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div key="abandon-reason-row" className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Abandonment Reason</label>
                    <Select defaultValue="select">
                      <SelectTrigger className="w-full !h-11 bg-white border-slate-200 text-[13px] font-bold text-slate-900 shadow-sm focus:ring-1 focus:ring-blue-500 rounded-lg">
                        <SelectValue placeholder="Select Reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select" disabled>Select Reason...</SelectItem>
                        <SelectItem value="price">Price too high</SelectItem>
                        <SelectItem value="shipping">Shipping cost</SelectItem>
                        <SelectItem value="justlooking">Just looking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div key="quick-notes-row" className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Quick Notes</label>
                    <Textarea 
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      className="min-h-[120px] resize-none text-[13px] bg-white border-slate-200 shadow-sm placeholder:text-slate-400 font-medium rounded-xl p-4 focus-visible:ring-1 focus-visible:ring-blue-500"
                      placeholder="Enter details about the call or customer interaction..."
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveNext} disabled={isLoading} className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold text-[14px] shadow-md rounded-xl flex items-center justify-center">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save & Next Cart
              </Button>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-3">Quick Actions</p>
              <div className="space-y-2.5">
                <Button variant="outline" className="w-full justify-between h-12 bg-white border-slate-200 shadow-sm font-bold text-[13px] text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl">
                  <span className="flex items-center gap-2.5"><Send className="w-4 h-4 text-blue-600" /> Send 15% SMS</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </Button>
                <Button onClick={handleScheduleCallback} disabled={isLoading} variant="outline" className="w-full justify-between h-12 bg-white border-slate-200 shadow-sm font-bold text-[13px] text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl">
                  <span className="flex items-center gap-2.5">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <CalendarPlus className="w-4 h-4 text-blue-600" />} 
                    Schedule Callback (Tomorrow)
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
