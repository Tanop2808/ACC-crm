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
import { getAssignedCarts, getCartTimeline, updateRecoveryStatus, addNote, scheduleFollowUp, getAgents, TEMP_LOGGED_IN_AGENT_ID } from "@/services/agentRecoveryService";
import { supabase } from "@/lib/supabase";

export default function AssignedCartsPage() {
  const [activeTab, setActiveTab] = useState("recent");
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  
  const [agents, setAgents] = useState<any[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(TEMP_LOGGED_IN_AGENT_ID);
  
  const [customers, setCustomers] = useState<any[]>([]);
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
      setCustomers(data);
      if (!selectedCartId) {
        const highValue = data.filter(c => (c.cart_value || 0) >= 5000);
        if (highValue.length > 0) {
          setSelectedCartId(highValue[0].cart_id);
        } else if (data.length > 0) {
          setSelectedCartId(data[0].cart_id);
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

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
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
    if (statusVal !== 'select') {
      await updateRecoveryStatus(selectedCustomer.cart_id, selectedCustomer.assignment_id, selectedCustomer.agent_id, statusVal, selectedCustomer.current_status);
    }
    if (quickNotes.trim()) {
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
      <header className="h-16 shrink-0 bg-white border-b border-border flex items-center justify-between px-6">
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
          <div className="flex items-center gap-6 text-[12px] font-bold">
            <div className="flex flex-col">
              <span className="text-muted-foreground tracking-wider uppercase text-[10px]">KPI:</span>
              <span className="text-green-600 text-[14px]">84% Recovered</span>
            </div>
            <div className="w-[1px] h-8 bg-border"></div>
            <div className="flex flex-col">
              <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Avg Call:</span>
              <span className="text-orange-500 text-[14px]">4:12</span>
            </div>
            <div className="w-[1px] h-8 bg-border"></div>
            <div className="flex flex-col">
              <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Daily Goal:</span>
              <span className="text-slate-900 text-[14px]">12/20</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Agent Switcher */}
            <Select value={activeAgentId} onValueChange={setActiveAgentId}>
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

            <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 ml-2">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
              <History className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="h-9 font-bold text-[13px] shadow-sm bg-white hover:bg-slate-50 text-slate-700 border-slate-200">Take Break</Button>
            <Button className="h-9 font-bold text-[13px] bg-blue-700 hover:bg-blue-800 text-white shadow-sm border-none">Go Ready</Button>
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
            <div className="flex p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 overflow-x-auto custom-scrollbar">
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'high_value' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('high_value')}>High Value</button>
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('pending')}>Pending</button>
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'follow_ups' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('follow_ups')}>Follow Ups</button>
              <button className={`shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === 'recent' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('recent')}>Recent</button>
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-2">Active Session</p>
            <div className="flex items-start justify-between mb-8">
              <h1 className="text-[40px] font-extrabold tracking-tight text-slate-900 w-1/2 leading-none">
                {`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'Unknown'}
              </h1>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-600"><Mail className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-600"><MessageSquare className="w-4 h-4" /></Button>
                {isCalling && (
                  <Button 
                    onClick={() => setIsCalling(false)}
                    variant="outline" 
                    className="h-10 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 font-bold gap-2 shadow-sm"
                  >
                    <PhoneOff className="w-4 h-4" /> End Call
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Customer Profile Card */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl flex flex-col">
                <div className="px-6 py-5 flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-700" />
                  <h3 className="font-bold text-[16px] text-slate-900">Customer Profile</h3>
                </div>
                <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-5 mb-6">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Customer Name</p>
                      <p className="text-[15px] font-bold text-slate-900">{`${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</p>
                      <p className="text-[14px] font-bold text-slate-900 truncate" title={selectedCustomer.email || ''}>{selectedCustomer.email || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact Number</p>
                        <p className="text-[14px] font-bold text-slate-900">{selectedCustomer.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cart Source</p>
                        <p className="text-[14px] font-bold text-slate-900 capitalize">{selectedCustomer.source || selectedCustomer.provider || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Shipping Address</p>
                      <p className="text-[14px] font-bold text-slate-900 leading-relaxed">{selectedCustomer.address || selectedCustomer.shipping_address || selectedCustomer.billing_address || 'Address not provided by integration'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Abandoned Cart Card */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl flex flex-col">
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-blue-700" />
                    <h3 className="font-bold text-[16px] text-slate-900">Abandoned Cart</h3>
                  </div>
                  <span className="font-extrabold text-[16px] text-slate-900">{formatCurrency(selectedCustomer.cart_value)}</span>
                </div>
                <CardContent className="px-6 pb-0 pt-0 flex-1 flex flex-col">
                  <div className="flex-1 space-y-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100 h-[180px] overflow-y-auto custom-scrollbar">
                    {activeProducts.length > 0 ? (
                      activeProducts.map((p: any, i: number) => {
                        const img = p.image_url || p.imageUrl || p.image || p.img || p.thumbnail || p.src || p.picture;
                        const name = p.name || p.product_name || p.title || p.item_name || 'Unknown Product';
                        const qty = p.qty || p.quantity || 1;
                        
                        return (
                          <div key={i} className="flex items-center gap-4">
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
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[10px] px-1.5 py-0 rounded">Qty: {qty}</Badge>
                                {(p.price || p.price === 0) && (
                                  <span className="text-[12px] font-extrabold text-slate-700">{formatCurrency(p.price)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center h-full text-[13px] text-slate-500 font-medium">
                        No product details found
                      </div>
                    )}
                  </div>
                  <div className="py-4 text-center">
                    <p className="text-[12px] font-medium text-slate-500">Abandoned: {formatTimeAgo(selectedCustomer.abandoned_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interaction History */}
            <div className="mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              <h3 className="font-extrabold text-[18px] text-slate-900">Interaction History</h3>
            </div>
            
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-slate-200">
              {timeline.length === 0 ? (
                <div className="text-sm text-slate-500 italic mt-4 pl-4">No activity history yet.</div>
              ) : (
                timeline.map((log, i) => {
                  let Icon = MessageSquare;
                  let bg = "bg-slate-200";
                  let text = "text-slate-600";
                  let title = log.activity_type.replace(/_/g, ' ');

                  if (log.activity_type === 'STATUS_CHANGED') {
                    Icon = Sparkles; bg = "bg-blue-100"; text = "text-blue-700";
                  } else if (log.activity_type === 'NOTE_ADDED') {
                    Icon = MessageSquare; bg = "bg-purple-100"; text = "text-purple-700";
                  } else if (log.activity_type === 'FOLLOW_UP_CREATED') {
                    Icon = CalendarPlus; bg = "bg-orange-100"; text = "text-orange-700";
                  } else if (log.activity_type === 'CALL_COMPLETED') {
                    Icon = PhoneCall; bg = "bg-green-100"; text = "text-green-700";
                  }

                  return (
                    <div key={i} className="relative flex items-start gap-5">
                      <div className={`absolute left-[calc(-1.5rem-2px)] top-1 h-7 w-7 rounded-full border-2 border-[#F8FAFC] ${bg} flex items-center justify-center shadow-sm z-10`}>
                        <Icon className={`h-3.5 w-3.5 ${text}`} />
                      </div>
                      <Card className="flex-1 shadow-sm border-slate-200 bg-white/80 rounded-2xl">
                        <div className="p-5">
                          <div className="flex justify-between items-center mb-3">
                            <p className="font-extrabold text-[15px] text-slate-900 capitalize">{title.toLowerCase()}</p>
                            <p className="text-[12px] font-medium text-slate-500">{formatTimeAgo(log.created_at)}</p>
                          </div>
                          <p className="text-[14px] text-slate-600 font-medium">
                            {log.description}
                          </p>
                        </div>
                      </Card>
                    </div>
                  );
                })
              )}
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
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-900">Update Status</label>
                    <Select value={statusVal} onValueChange={setStatusVal}>
                      <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-[13px] font-bold text-slate-900 shadow-sm focus:ring-1 focus:ring-blue-500 rounded-lg">
                        <SelectValue placeholder="Select Status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select" disabled>Select Status...</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-900">Abandonment Reason</label>
                    <Select defaultValue="select">
                      <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-[13px] font-bold text-slate-900 shadow-sm focus:ring-1 focus:ring-blue-500 rounded-lg">
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

                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-900">Quick Notes</label>
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
