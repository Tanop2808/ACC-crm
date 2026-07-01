"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User, Bell, Calendar as CalendarIcon, Filter, Download, PhoneCall, MapPin, 
  ShoppingCart, Phone, MoreVertical, CheckCircle2, ChevronLeft, 
  ChevronRight, MessageSquare, Mail, FileEdit, Search,
  Heart, HeartHandshake, Sparkles, Smile, MessageCircle, Loader2, Hash
} from "lucide-react";
import { getAssignedCarts, getBrands, getProviders, TEMP_LOGGED_IN_AGENT_ID, AssignedCart, getCustomerHistory, getCartTimeline, addNote, updateStatusAndNote } from "@/services/agentRecoveryService";
import { supabase } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";

export default function AbandonedCartsPage() {
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Agent");
  const [customers, setCustomers] = useState<AssignedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState("calls");
  const [activeDetailTab, setActiveDetailTab] = useState("script");
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<AssignedCart[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [noteCallStatus, setNoteCallStatus] = useState("");
  const [pendingRecoveryStatus, setPendingRecoveryStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityInput, setActivityInput] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [cartMin, setCartMin] = useState<number>(200);
  const [cartMax, setCartMax] = useState<number>(15000);
  const [abandonedFrom, setAbandonedFrom] = useState<string>('');
  const [abandonedTo, setAbandonedTo] = useState<string>('');
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [timeFilter, setTimeFilter] = useState("all_time");

  const handleTimeFilterChange = (val: string | null) => {
    const safeVal = val || 'all_time';
    setTimeFilter(safeVal);
    let from = '';
    let to = '';
    if (safeVal === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      from = d.toISOString().split('T')[0];
      to = d.toISOString().split('T')[0];
    } else if (safeVal === 'last_week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split('T')[0];
      to = new Date().toISOString().split('T')[0];
    } else if (safeVal === 'last_month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      from = d.toISOString().split('T')[0];
      to = new Date().toISOString().split('T')[0];
    }
    setAbandonedFrom(from);
    setAbandonedTo(to);
  };

  const pageSize = 50;
  
  const handleExport = () => {
    if (!customers || customers.length === 0) return;
    const csvHeader = "Customer Name,Email,Phone,Cart Value,Abandoned At,Status,Brand ID\n";
    const csvContent = customers.map(c => 
      `"${c.customer_name || ''}","${c.customer_email || ''}","${c.customer_phone || ''}",${c.cart_value || 0},"${c.abandoned_at || ''}","${c.current_status || ''}","${c.brand_id || ''}"`
    ).join("\n");
    
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `abandoned_carts_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  async function fetchCarts(page: number, tab: string, brand: string, filtersState?: any) {
    setIsLoading(true);
    const filters = { listTab: tab, brand_name: brand, ...filtersState };
    console.log("Fetching carts with filters:", filters);
    const { data, count, error } = await getAssignedCarts('all', page, pageSize, filters);
    console.log("Fetched data:", data?.length, "count:", count, "error:", error);
    
    if (data) {
      setCustomers(data);
      if (data.length > 0 && !data.find(c => c.id === selectedCartId)) {
        setSelectedCartId(data[0].id);
      } else if (data.length === 0) {
        setSelectedCartId(null);
      }
    }
    if (count !== null) setTotalCount(count);
    setIsLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: bData } = await getBrands();
      if (bData) setBrands(bData);
      
      const { data: pData } = await getProviders();
      if (pData) setProviders(pData);

      const email = typeof window !== 'undefined' ? localStorage.getItem('session_email') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('session_role') : null;
      
      if (role) setUserRole(role.charAt(0).toUpperCase() + role.slice(1));
      
      if (email) {
        if (role === 'agent') {
          const { data: agentData } = await (supabase as any).from('agents').select('name, id').eq('email', email).maybeSingle();
          if (agentData) {
            if (agentData.name) setUserName(agentData.name);
            if (agentData.id) setCurrentAgentId(agentData.id);
          } else {
            setUserName(email.split('@')[0]);
          }
        } else {
          setUserName(email.split('@')[0]);
        }
      }
    }
    init();

    const channel = supabase.channel('cart_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'abandoned_cart_master' }, (payload) => {
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCarts(currentPage, activeListTab, selectedBrand, {
        searchQuery,
        cartMin,
        cartMax,
        abandonedFrom,
        abandonedTo,
        selectedPriorities
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [currentPage, activeListTab, selectedBrand, refreshTrigger, searchQuery, cartMin, cartMax, abandonedFrom, abandonedTo, selectedPriorities]);

  const selectedCustomer = customers.find(c => c.id === selectedCartId) || customers[0];

  useEffect(() => {
    async function loadHistory() {
      if (!selectedCustomer) return;
      setIsLoadingHistory(true);
      const { data } = await getCustomerHistory(
        selectedCustomer.customer_email, 
        selectedCustomer.customer_phone, 
        selectedCustomer.id
      );
      setCustomerHistory(data);
      setIsLoadingHistory(false);
    }
    
    async function loadTimeline() {
      if (!selectedCustomer) return;
      setIsTimelineLoading(true);
      const { data } = await getCartTimeline(selectedCustomer.id);
      setTimeline(data || []);
      setIsTimelineLoading(false);
    }
    
    loadHistory();
    loadTimeline();
  }, [selectedCustomer?.id, refreshTrigger]);

  const handleAddNote = async () => {
    if ((!noteInput.trim() && !noteCallStatus) || !selectedCustomer) return;
    setIsSubmittingNote(true);
    
    let finalNote = noteInput;
    if (noteCallStatus) {
      finalNote = noteInput ? `[${noteCallStatus}] ${noteInput}` : `[${noteCallStatus}]`;
    }
    
    // Intentionally not updating the overall call_status here to prevent the cart from jumping sections.
    // The call status will just be recorded as text inside the note prefix.

    const { error } = await addNote(
      selectedCustomer.id, 
      null as any,
      (currentAgentId || null) as any, 
      finalNote
    );
    
    if (!error) {
      setNoteInput("");
      setNoteCallStatus("");
      setRefreshTrigger(prev => prev + 1);
    }
    setIsSubmittingNote(false);
  };

  const [isCalling, setIsCalling] = useState(false);
  const handleStartCall = async (cartId: string, brandId: string) => {
    const activeAgentId = currentAgentId || TEMP_LOGGED_IN_AGENT_ID;
    if (!activeAgentId) {
      alert("Error: You must be logged in as an Agent to make calls. No Agent ID found in session.");
      return;
    }
    
    setIsCalling(true);
    try {
      // dynamic import so we don't break SSR
      const { initiateCall } = await import('@/services/telephonyService');
      const res = await initiateCall(cartId, activeAgentId, brandId);
      if (res.success) {
        // We could show a toast here
        console.log("Call initiated successfully", res.data);
      } else {
        alert(res.error || "Failed to initiate call");
      }
    } catch (err: any) {
      alert("Error initiating call: " + err.message);
    } finally {
      setIsCalling(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedCustomer) return;
    
    let callStatusUpdate: string | undefined = undefined;
    if (newStatus === 'interested') callStatusUpdate = 'Interested';
    else if (newStatus === 'completed') callStatusUpdate = 'Converted';
    else if (newStatus === 'not_interested') callStatusUpdate = 'Not Interested';
    else if (newStatus === 'attempted') callStatusUpdate = 'Attempted (No Answer)';
    else if (newStatus === 'calls') callStatusUpdate = 'Addressable';

    const { error } = await updateStatusAndNote(
      selectedCustomer.id,
      null as any,
      (currentAgentId || null) as any,
      newStatus,
      selectedCustomer.current_status,
      selectedCustomer.notes || "",
      callStatusUpdate
    );

    if (!error) {
      setPendingRecoveryStatus(""); // Reset the dropdown state
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleAddActivity = async () => {
    if (!activityInput.trim() || !selectedCustomer) return;
    setIsSubmittingActivity(true);
    
    const { error } = await addNote(
      selectedCustomer.id, 
      null as any,
      (currentAgentId || null) as any, 
      activityInput
    );
    
    if (error) {
      console.warn('Warning: Error logging manual activity:', error);
    }
    
    setActivityInput("");
    setRefreshTrigger(prev => prev + 1);
    setIsSubmittingActivity(false);
  };

  const formatCurrency = (val: any) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString()}`;
  };

  const parseDateUTC = (dateStr: string) => {
    let safe = dateStr;
    if (!safe.includes('Z') && !safe.match(/[+-]\d{2}:?\d{2}$/)) {
      safe += '+05:30'; // Shiprocket sends dates in IST without timezone info
    }
    return new Date(safe);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const d = parseDateUTC(dateStr);
    return `${d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  };
  
  const getDaysAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const targetDate = parseDateUTC(dateStr);
    const now = new Date();
    
    // Get date string in IST and parse to local Date object
    const targetIST = new Date(targetDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Reset to midnight for calendar day comparison
    targetIST.setHours(0, 0, 0, 0);
    nowIST.setHours(0, 0, 0, 0);
    
    const diff = nowIST.getTime() - targetIST.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getPriority = (val: number) => {
    if (val >= 3000) return { label: 'High', color: 'text-red-600 bg-red-50 border-red-100' };
    if (val >= 1500) return { label: 'Medium', color: 'text-orange-600 bg-orange-50 border-orange-100' };
    return { label: 'Low', color: 'text-green-600 bg-green-50 border-green-100' };
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  };

  const togglePriority = (p: string) => setSelectedPriorities(prev =>
    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] -m-4 md:-m-6 font-sans">
      
      {/* Top Header */}
      <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="pl-14 md:pl-20">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Abandoned Cart Calling</h1>
          <p className="text-sm text-slate-500 font-medium">Turn abandoned carts into happy customers</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
            <SelectTrigger className="w-[180px] bg-white h-10 font-medium rounded-md shadow-sm border-slate-200 text-slate-700">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <SelectValue placeholder="Select timeframe" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_week">Last 7 Days</SelectItem>
              <SelectItem value="last_month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedBrand} onValueChange={(val) => setSelectedBrand(val || "all")}>
            <SelectTrigger className="w-[200px] h-10 border-slate-200 text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="truncate">{selectedBrand === 'all' ? 'All Brands' : selectedBrand}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-white text-slate-700 border-slate-200 shadow-sm font-medium h-10 px-4" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2 text-slate-500" /> Export
          </Button>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 bg-transparent m-0 p-0">
            <div className="flex items-center gap-3 pl-4">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-tight">{userName}</p>
                <p className="text-xs font-medium text-slate-500 leading-tight">{userRole}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Padding */}
      <div className="p-8 flex-1 flex flex-col max-w-[1800px] w-full mx-auto">
        
        {/* 2-Pane Unified Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] flex-1 overflow-hidden min-h-[700px]">
          
          {/* Middle Pane - List */}
          <div className="flex flex-col min-w-0 min-h-0 overflow-hidden border-r border-slate-200">
            {/* List Tabs + Filter */}
            <div className="flex items-center border-b border-slate-200 px-4 bg-white shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 mr-3 my-2 border-slate-200 text-slate-600 hover:text-[#7B5EE4] hover:border-[#7B5EE4]/30"
                onClick={() => setIsFiltersOpen(true)}
                title="Filters"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <div className="flex flex-1 overflow-x-auto custom-scrollbar pt-2 min-w-0">
              {[
                { id: 'all', label: 'All Carts' },
                { id: 'calls', label: 'Addressable' },
                { id: 'attempted', label: 'Attempted (No Answer)' },
                { id: 'recovered', label: 'Recovered' },
                { id: 'interested', label: 'Interested' },
                { id: 'not_interested', label: 'Not Interested' },
                { id: 'completed', label: 'Converted' }
              ].map(tab => {
                const isActive = activeListTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveListTab(tab.id)}
                    className={`px-5 py-4 text-[14px] font-bold whitespace-nowrap transition-colors border-b-2 ${
                      isActive ? 'text-[#7B5EE4] border-[#7B5EE4]' : 'text-slate-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
              </div>
            </div>
            
            {/* List Header + Rows */}
            <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
              <div className="min-w-[720px]">
            {activeListTab === 'recovered' ? (
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-white">
                <div className="col-span-1 flex items-center justify-center"><Checkbox className="w-4 h-4 rounded" /></div>
                <div className="col-span-3 text-[12px] font-bold text-slate-500">Customer</div>
                <div className="col-span-3 text-[12px] font-bold text-slate-500">Order ID</div>
                <div className="col-span-2 text-[12px] font-bold text-slate-500">Amount</div>
                <div className="col-span-3 text-[12px] font-bold text-slate-500">Order Details</div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-white">
                <div className="col-span-1 flex items-center justify-center"><Checkbox className="w-4 h-4 rounded" /></div>
                <div className="col-span-3 text-[12px] font-bold text-slate-500">Customer</div>
                <div className="col-span-2 text-[12px] font-bold text-slate-500">Cart Value</div>
                <div className="col-span-2 text-[12px] font-bold text-slate-500">Abandoned</div>
                <div className="col-span-3 text-[12px] font-bold text-slate-500">Agent</div>
                <div className="col-span-1 text-[12px] font-bold text-slate-500 text-center">Action</div>
              </div>
            )}

            {/* List Content */}
            <div>
              {customers.map((c) => {
                const isSelected = c.id === selectedCartId;
                const prio = getPriority(c.cart_value || 0);
                
                return (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedCartId(c.id)}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 items-center cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#F4F1FD]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      <Checkbox checked={isSelected} className={isSelected ? "data-[state=checked]:bg-[#7B5EE4] data-[state=checked]:border-[#7B5EE4]" : ""} />
                    </div>
                    
                    {activeListTab === 'recovered' ? (
                      <>
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[12px] shrink-0">
                            {getInitials(c.customer_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 truncate">{c.customer_name || 'Unknown'}</p>
                            <p className="text-[12px] font-medium text-slate-500 truncate">{c.customer_phone || c.customer_email}</p>
                          </div>
                        </div>
                        <div className="col-span-3">
                           <p className="text-[13px] font-medium text-slate-900 truncate font-mono">
                             {c.source === 'shiprocket' ? (c.cart_id || 'N/A') : (c.checkout_name || c.cart_id || 'N/A')}
                           </p>
                           <p className="text-[11px] font-medium text-slate-500">{c.source === 'shiprocket' ? 'Shiprocket' : 'Shopify'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[14px] font-bold text-slate-900">{formatCurrency(c.cart_value)}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-[12px] font-medium text-slate-600 line-clamp-2">
                             {Array.isArray(c.products) ? c.products.map((p: any) => p.name || p.product).join(', ') : 'No product details'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[12px] shrink-0">
                            {getInitials(c.customer_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 truncate">{c.customer_name || 'Unknown'}</p>
                            <p className="text-[12px] font-medium text-slate-500 truncate">{c.customer_phone || c.customer_email}</p>
                            <p className="text-[11px] font-medium text-slate-400 truncate font-mono">ID: {c.checkout_name || c.cart_id}</p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[14px] font-bold text-slate-900">{formatCurrency(c.cart_value)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[13px] font-bold text-slate-900">{getDaysAgo(c.abandoned_at)}</p>
                          <p className="text-[12px] font-medium text-slate-500">{formatDateTime(c.abandoned_at).split(', ')[1] || ''}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-[13px] font-bold text-slate-900 truncate">{c.agent_name || 'Unassigned'}</p>
                          <p className="text-[12px] font-medium text-slate-500 truncate">{c.assignment_status || 'Pending'}</p>
                          {c.current_status && c.current_status !== 'calls' && (
                            <Badge className="mt-1 shrink-0 border-none text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[#F4F1FD] text-[#7B5EE4]">
                              {c.current_status === 'attempted' ? 'Attempted (No Answer)' :
                               c.current_status === 'not_interested' ? 'Not Interested' :
                               c.current_status === 'completed' ? 'Converted' :
                               c.current_status.charAt(0).toUpperCase() + c.current_status.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-1 flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // prevent row selection if just clicking call
                              if (c.id && c.brand_id) handleStartCall(c.id, c.brand_id);
                            }}
                            disabled={isCalling || !c.customer_phone}
                            className="w-8 h-8 rounded-full bg-[#F4F1FD] text-[#7B5EE4] flex items-center justify-center hover:bg-[#EAE4FC] transition-colors disabled:opacity-50"
                            title={!c.customer_phone ? "No phone number available" : "Call Customer"}
                          >
                            {isCalling && selectedCartId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PhoneCall className="w-3 h-3" />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {customers.length === 0 && !isLoading && (
                <div className="p-12 text-center text-slate-500 font-medium">No carts found.</div>
              )}
            </div>
              </div>
            </div>
            
            {/* List Footer / Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[13px] font-medium bg-white shrink-0">
              <p>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results</p>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                ><ChevronLeft className="w-4 h-4" /></Button>
                <span className="font-bold text-slate-600 px-2">{currentPage}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * pageSize >= totalCount}
                ><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>

          {/* Right Pane - Details */}
          <div className="flex flex-col bg-white overflow-hidden min-h-0">
            {selectedCustomer ? (
              <>
                {/* Profile Block */}
                <div className="p-6 pb-0">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
                      {getInitials(selectedCustomer.customer_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-[17px] font-bold text-slate-900 leading-tight break-words">{selectedCustomer.customer_name || 'Unknown'}</h2>
                        {/* Priority removed */}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-slate-500 flex items-start gap-2">
                          <PhoneCall className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="break-all">{selectedCustomer.customer_phone || 'N/A'}</span>
                        </p>
                        <p className="text-[13px] font-medium text-slate-500 flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="break-words">{[selectedCustomer.city, selectedCustomer.state, selectedCustomer.country].filter(Boolean).join(', ') || 'Unknown Location'}</span>
                        </p>
                        <p className="text-[13px] font-medium text-slate-500 flex items-start gap-2">
                          <ShoppingCart className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="break-words">
                            {selectedCustomer.brand_name || 'Unknown Brand'}
                            {' • '}
                            {selectedCustomer.source ? selectedCustomer.source.charAt(0).toUpperCase() + selectedCustomer.source.slice(1) : (providers.find(p => p.id === selectedCustomer.provider_id)?.name || 'Unknown Provider')}
                          </span>
                        </p>
                        <p className="text-[13px] font-medium text-slate-500 flex items-start gap-2">
                          <Hash className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="break-words font-mono text-[12px] pt-[1px]">ID: {selectedCustomer.checkout_name || selectedCustomer.cart_id || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[12px] text-slate-500 mb-0.5 font-medium">Cart Value</p>
                      <p className="text-[16px] font-bold text-slate-900">{formatCurrency(selectedCustomer.cart_value)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-slate-500 mb-0.5 font-medium">Abandoned</p>
                      <p className="text-[13px] font-medium text-slate-900">{formatDateTime(selectedCustomer.abandoned_at)}</p>
                      <p className="text-[12px] text-slate-500 font-medium">{getDaysAgo(selectedCustomer.abandoned_at)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-slate-500 mb-0.5 font-medium">Last Updated</p>
                      <p className="text-[13px] font-medium text-slate-900">{selectedCustomer.updated_at ? formatDateTime(selectedCustomer.updated_at) : '-'}</p>
                      <p className="text-[12px] text-slate-500 font-medium">{selectedCustomer.updated_at ? getDaysAgo(selectedCustomer.updated_at) : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-5 px-1">
                    <Select 
                      value={pendingRecoveryStatus || (['calls', 'interested', 'attempted', 'completed', 'not_interested', 'recovered'].includes(selectedCustomer.current_status || '') ? selectedCustomer.current_status : '') || ''} 
                      onValueChange={(val) => setPendingRecoveryStatus(val || "")}
                    >
                      <SelectTrigger className="w-[180px] bg-white border-slate-200 text-slate-700 text-[13px] font-bold">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calls">Addressable</SelectItem>
                        <SelectItem value="attempted">Attempted (No Answer)</SelectItem>
                        <SelectItem value="recovered">Recovered</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                        <SelectItem value="completed">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      className="bg-[#7B5EE4] hover:bg-[#684bd3] text-white text-[13px] h-9 px-6 rounded-md font-bold"
                      onClick={() => {
                        const statusToUpdate = pendingRecoveryStatus || selectedCustomer.current_status;
                        if (statusToUpdate) {
                          handleUpdateStatus(statusToUpdate);
                        }
                      }}
                      disabled={!pendingRecoveryStatus || pendingRecoveryStatus === selectedCustomer.current_status}
                    >
                      Proceed
                    </Button>
                  </div>
                  
                  {/* Detail Tabs */}
                  <div className="flex flex-wrap gap-x-1 gap-y-0 border-b border-slate-100 pb-px">
                    {['Cart Details', 'Customer Info', 'Call Script', 'History', 'Activity', 'Notes'].map(tab => {
                      const tabId = tab.split(' ')[1] ? tab.split(' ')[1].toLowerCase() : tab.split(' ')[0].toLowerCase();
                      const isActive = activeDetailTab === tabId || (tabId === 'script' && activeDetailTab === 'script');
                      return (
                        <button 
                          key={tab}
                          onClick={() => setActiveDetailTab(tabId)}
                          className={`px-3 py-2.5 text-[13px] font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                            isActive ? 'text-[#7B5EE4] border-[#7B5EE4]' : 'text-slate-500 border-transparent hover:text-slate-800'
                          }`}
                        >
                          {tab}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {/* Ready to call banner */}
                  <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4 flex flex-col gap-4 mb-6 shadow-sm">
                    <div>
                      <p className="text-[14px] font-bold text-[#16A34A] flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-5 h-5 shrink-0" /> Ready to Call
                      </p>
                      <p className="text-[13px] font-medium text-[#15803D]">Customer is available. You can start the call.</p>
                    </div>
                    <Button 
                      onClick={() => selectedCustomer?.id && selectedCustomer?.brand_id && handleStartCall(selectedCustomer.id, selectedCustomer.brand_id)}
                      disabled={isCalling || !selectedCustomer?.customer_phone}
                      className="w-full bg-[#7B5EE4] hover:bg-[#684bd3] text-white shadow-md rounded-xl font-bold h-11 flex items-center justify-center gap-2 transition-colors text-[14px]"
                    >
                      {isCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4 fill-white" />} 
                      {isCalling ? 'Starting Call...' : 'Start Call'}
                    </Button>
                  </div>

                  {activeDetailTab === 'script' && (
                    <>
                      {/* Script Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-[16px] text-slate-900">Call Script</h3>
                        <Select defaultValue="script-a">
                          <SelectTrigger className="w-[180px] h-10 border-slate-200 text-[13px] font-bold text-slate-700 rounded-lg shadow-sm">
                            <SelectValue placeholder="Script A - Standard" />
                          </SelectTrigger>
                          <SelectContent><SelectItem value="script-a">Script A - Standard</SelectItem></SelectContent>
                        </Select>
                      </div>

                      {/* Script Sections */}
                      <div className="space-y-6">
                        <div>
                          <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2.5 mb-2">
                            <HeartHandshake className="w-4 h-4 text-slate-400" /> Opening
                          </p>
                          <p className="text-[13px] text-slate-600 font-medium pl-6 leading-relaxed">
                            Hi {selectedCustomer.customer_name?.split(' ')[0] || 'there'}, this is [agent_name] from {brands.find(b => b.id === selectedCustomer.brand_id)?.name || 'our company'}. Am I speaking with {selectedCustomer.customer_name || 'them'}?
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2.5 mb-2">
                            <span className="w-4 flex justify-center text-slate-400">💡</span> Reason
                          </p>
                          <p className="text-[13px] text-slate-600 font-medium pl-6 leading-relaxed">
                            I noticed you added some amazing items to your cart but couldn't complete your order.
                          </p>
                        </div>

                        <div>
                          <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2.5 mb-2">
                            <Smile className="w-4 h-4 text-slate-400" /> Empathy
                          </p>
                          <p className="text-[13px] text-slate-600 font-medium pl-6 leading-relaxed">
                            I just wanted to check if everything is okay? Was there something I could help you with?
                          </p>
                        </div>

                        <div>
                          <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2.5 mb-2">
                            <Sparkles className="w-4 h-4 text-slate-400" /> Offer
                          </p>
                          <p className="text-[13px] text-slate-600 font-medium pl-6 leading-relaxed">
                            As a special offer, I can give you an extra 5% off if you complete the order now.
                          </p>
                        </div>

                        <div>
                          <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2.5 mb-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" /> Closing
                          </p>
                          <p className="text-[13px] text-slate-600 font-medium pl-6 leading-relaxed">
                            Can I help you place the order now?
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {activeDetailTab === 'info' && (
                    <div className="space-y-5">
                      <h3 className="font-bold text-[16px] text-slate-900">Customer Information</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[12px] text-slate-500 font-bold mb-1">Email Address</p>
                          <p className="text-[14px] text-slate-900 font-medium break-all">{selectedCustomer.customer_email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[12px] text-slate-500 font-bold mb-1">Phone Number</p>
                          <p className="text-[14px] text-slate-900 font-medium">{selectedCustomer.customer_phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[12px] text-slate-500 font-bold mb-1">Shipping Address</p>
                          <p className="text-[14px] text-slate-900 font-medium leading-relaxed break-words">
                            {[selectedCustomer.address1, selectedCustomer.address2, selectedCustomer.city, selectedCustomer.state, selectedCustomer.country, selectedCustomer.zip].filter(Boolean).join(', ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'details' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-[16px] text-slate-900 mb-4">Cart Details</h3>
                      {selectedCustomer.checkout_url && (
                        <div className="mb-6">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Checkout URL</p>
                          <div className="flex gap-2 flex-col sm:flex-row">
                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 flex-1 overflow-hidden flex items-center min-w-0">
                              <p className="text-[13px] text-slate-600 break-all">{selectedCustomer.checkout_url}</p>
                            </div>
                            <Button 
                              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-md px-4 text-[13px] shrink-0 w-full sm:w-auto" 
                              onClick={() => {
                                navigator.clipboard.writeText(selectedCustomer.checkout_url || '');
                              }}
                            >
                              COPY URL
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[13px] text-slate-500 font-bold">Total Value</p>
                          <p className="text-[15px] text-slate-900 font-black">{formatCurrency(selectedCustomer.cart_value)}</p>
                        </div>
                        <div className="h-px bg-slate-200"></div>
                        <div className="space-y-3">
                          {Array.isArray(selectedCustomer.products) && selectedCustomer.products.map((prod: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start gap-3">
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-slate-800 line-clamp-2">{prod.product || prod.name}</p>
                                  <p className="text-[12px] font-medium text-slate-500">Qty: {prod.quantity}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!selectedCustomer.products || selectedCustomer.products.length === 0) && (
                        <p className="text-[13px] text-slate-500">No product details available.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'activity' && (
                    <div className="space-y-4">
                      {/* General Activity Timeline */}
                      {isTimelineLoading ? (
                        <div className="text-center p-8 text-sm text-slate-500">Loading activity...</div>
                      ) : (!selectedCustomer.activity_logs || selectedCustomer.activity_logs.length === 0) ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                          <p className="text-[13px] font-bold text-slate-500 mb-1">No Recent Activity</p>
                          <p className="text-[12px] text-slate-400 text-center max-w-[250px]">Activity events like calls, SMS, and status changes will appear here.</p>
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 py-2">
                          {[...(selectedCustomer.activity_logs || [])].reverse().map((log: any, idx: number) => (
                            <div key={idx} className="relative pl-6">
                              <div className="absolute w-3 h-3 bg-white border-2 border-[#7B5EE4] rounded-full -left-[7px] top-1.5" />
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-[13px] font-bold text-slate-900">{log.type === 'note' ? 'Call Remark' : (log.activity_type?.replace(/_/g, ' ') || 'Activity')}</p>
                                  <p className="text-[11px] font-medium text-slate-500 shrink-0">{formatDateTime(log.timestamp)}</p>
                                </div>
                                <p className="text-[13px] text-slate-600">{log.content || log.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeDetailTab === 'history' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-[16px] text-slate-900 mb-4">Previous Carts</h3>
                      
                      {isLoadingHistory ? (
                        <div className="text-center p-8 text-sm text-slate-500">Loading history...</div>
                      ) : customerHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                          <p className="text-[13px] font-bold text-slate-500 mb-1">No Previous History</p>
                          <p className="text-[12px] text-slate-400 text-center max-w-[250px]">This is the first recorded cart for this customer.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerHistory.map((histCart) => (
                            <div key={histCart.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-[13px] text-slate-800 font-bold mb-0.5">{histCart.brand_name || 'Unknown Brand'}</p>
                                  <p className="text-[12px] text-slate-500 font-medium">{formatDateTime(histCart.abandoned_at)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[14px] text-slate-900 font-bold mb-0.5">{formatCurrency(histCart.cart_value)}</p>
                                  <Badge className={`shrink-0 border-none text-[10px] font-bold px-2 py-0 rounded-sm ${(histCart.current_status === 'completed' || histCart.cart_status === 'RECOVERED') ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                                    {(histCart.current_status || histCart.cart_status || 'ABANDONED').toUpperCase().replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-[12px] text-slate-600 mt-1 line-clamp-1">
                                {Array.isArray(histCart.products) ? histCart.products.map((p: any) => p.name || p.product).join(', ') : 'No product details'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeDetailTab === 'notes' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-[16px] text-slate-900 mb-2">Internal Notes</h3>
                      
                      <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Select value={noteCallStatus} onValueChange={(val) => setNoteCallStatus(val || "")}>
                          <SelectTrigger className="w-full bg-white border-slate-200 text-slate-700 text-[13px]">
                            <SelectValue placeholder="Select Call Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Connected">Connected</SelectItem>
                            <SelectItem value="No Answer">No Answer</SelectItem>
                            <SelectItem value="Busy">Busy</SelectItem>
                            <SelectItem value="Disconnected">Disconnected</SelectItem>
                            <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                            <SelectItem value="Follow-up">Follow-up</SelectItem>
                            <SelectItem value="DND">DND</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea 
                          placeholder="Add a new note..." 
                          className="min-h-[80px] text-[13px] bg-white border-slate-200"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <Button 
                            className="bg-[#7B5EE4] hover:bg-[#684bd3] text-white text-[12px] h-9 px-4 rounded-lg font-bold"
                            onClick={handleAddNote}
                            disabled={isSubmittingNote || !noteInput.trim()}
                          >
                            {isSubmittingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Note
                          </Button>
                        </div>
                      </div>

                      <div className="mt-8 relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-start">
                          <span className="bg-white pr-4 text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">
                            Call Remarks
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        {[1, 2, 3].map((num) => {
                          const ordinal = num === 1 ? '1ST' : num === 2 ? '2ND' : '3RD';
                          
                          // Look up notes in activity_logs
                          const notesList = Array.isArray(selectedCustomer.activity_logs) 
                            ? selectedCustomer.activity_logs.filter((log: any) => log.type === 'note' || log.activity_type === 'NOTE_ADDED') 
                            : [];
                          
                          const noteForCall = notesList[num - 1];
                          const hasNote = !!noteForCall;

                          return (
                            <div key={num} className="bg-[#FAF9F6] border border-slate-100 rounded-xl p-5 flex gap-5 shadow-sm">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[12px] font-bold shrink-0">
                                {num}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                  {ordinal} CALL REMARKS
                                </h4>
                                <p className={`text-[14px] leading-relaxed ${hasNote ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                  {hasNote ? noteForCall.content || noteForCall.description : 'No remarks recorded.'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="h-px bg-slate-100 my-8"></div>
                </div>

                <div className="p-6 pt-0 bg-white shrink-0 border-t border-slate-100">
                  <p className="text-[14px] font-bold text-slate-900 mb-3 pt-4">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-10 px-3 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <MessageCircle className="w-4 h-4 text-[#16A34A] shrink-0" /> WhatsApp
                    </Button>
                    <Button variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-10 px-3 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <MessageSquare className="w-4 h-4 text-slate-500 shrink-0" /> SMS
                    </Button>
                    <Button variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-10 px-3 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" /> Email
                    </Button>
                    <Button 
                      variant="outline" 
                      className="bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-10 px-3 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      onClick={() => setActiveDetailTab('notes')}
                    >
                      <FileEdit className="w-4 h-4 text-slate-500 shrink-0" /> Add Note
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-medium p-8 text-center">
                {isLoading ? "Loading customer..." : "No customer selected."}
              </div>
            )}
          </div>
        </div>

        {/* Filters Sheet */}
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetContent side="left" className="w-[320px] sm:max-w-[320px] p-0 flex flex-col">
            <SheetHeader className="px-6 pt-6 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between pr-8">
                <SheetTitle className="font-bold text-[16px] text-slate-900">Filters</SheetTitle>
                <button
                onClick={() => { setCartMin(200); setCartMax(15000); setAbandonedFrom(''); setAbandonedTo(''); setSelectedPriorities([]); }}
                className="text-[13px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >Clear All</button>
              </div>
            </SheetHeader>
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Search filters" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 bg-white border-slate-200 rounded-lg text-[13px] shadow-sm font-medium" 
                />
              </div>
            </div>
            <div className="px-6 flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-6">

              {/* Cart Value — dual-thumb range slider */}
              <div className="space-y-4">
                <label className="text-[13px] font-bold text-slate-600">Cart Value</label>
                <div className="px-1">
                  <div className="relative h-5 flex items-center mb-5">
                    {/* track background */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-200 rounded-full pointer-events-none" />
                    {/* active fill */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-[#7B5EE4] rounded-full pointer-events-none"
                      style={{
                        left: `${((cartMin - 200) / 14800) * 100}%`,
                        right: `${100 - ((cartMax - 200) / 14800) * 100}%`,
                      }}
                    />
                    {/* min thumb */}
                    <input
                      type="range"
                      min={200}
                      max={15000}
                      step={100}
                      value={cartMin}
                      onChange={e => setCartMin(Math.min(Number(e.target.value), cartMax - 500))}
                      className="absolute inset-0 w-full pointer-events-none appearance-none bg-transparent
                        [&::-webkit-slider-runnable-track]:bg-transparent
                        [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#7B5EE4]
                        [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
                        [&::-moz-range-track]:bg-transparent
                        [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-[#7B5EE4] [&::-moz-range-thumb]:shadow-md"
                      style={{ zIndex: cartMin > cartMax - 3000 ? 5 : 3 }}
                    />
                    {/* max thumb */}
                    <input
                      type="range"
                      min={200}
                      max={15000}
                      step={100}
                      value={cartMax}
                      onChange={e => setCartMax(Math.max(Number(e.target.value), cartMin + 500))}
                      className="absolute inset-0 w-full pointer-events-none appearance-none bg-transparent
                        [&::-webkit-slider-runnable-track]:bg-transparent
                        [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#7B5EE4]
                        [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
                        [&::-moz-range-track]:bg-transparent
                        [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-[#7B5EE4] [&::-moz-range-thumb]:shadow-md"
                      style={{ zIndex: 4 }}
                    />
                  </div>
                  {/* Min / Max value pills */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">Min</p>
                      <p className="text-[14px] font-bold text-slate-800">₹{cartMin.toLocaleString()}</p>
                    </div>
                    <div className="w-4 h-px bg-slate-300 shrink-0" />
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">Max</p>
                      <p className="text-[14px] font-bold text-slate-800">₹{cartMax.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Abandoned — date range */}
              <div className="space-y-4">
                <label className="text-[13px] font-bold text-slate-600">Abandoned</label>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">From</p>
                    <input
                      type="date"
                      value={abandonedFrom}
                      onChange={e => setAbandonedFrom(e.target.value)}
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EE4]/20 focus:border-[#7B5EE4] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To</p>
                    <input
                      type="date"
                      value={abandonedTo}
                      min={abandonedFrom || undefined}
                      onChange={e => setAbandonedTo(e.target.value)}
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EE4]/20 focus:border-[#7B5EE4] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Priority filters removed */}

            </div>
            <SheetFooter className="px-6 pb-6 pt-0 border-t border-slate-100">
              <Button 
                className="w-full h-12 bg-[#7B5EE4] hover:bg-[#684bd3] text-white font-bold rounded-xl shadow-md text-[14px]"
                onClick={() => setIsFiltersOpen(false)}
              >
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

      </div>
    </div>
  );
}
