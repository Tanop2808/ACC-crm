"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Bell, Calendar as CalendarIcon, Filter, Download, PhoneCall, MapPin, 
  ShoppingCart, Phone, MoreVertical, CheckCircle2, ChevronLeft, 
  ChevronRight, MessageSquare, Mail, FileEdit, Search,
  Heart, HeartHandshake, Sparkles, Smile, MessageCircle
} from "lucide-react";
import { getAssignedCarts, getBrands, getProviders, TEMP_LOGGED_IN_AGENT_ID, AssignedCart, getCustomerHistory } from "@/services/agentRecoveryService";
import { supabase } from "@/lib/supabase";

export default function AbandonedCartsPage() {
  const [customers, setCustomers] = useState<AssignedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState("calls");
  const [activeDetailTab, setActiveDetailTab] = useState("script");
  const [customerHistory, setCustomerHistory] = useState<AssignedCart[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 4, 12),
    to: new Date(2025, 4, 18),
  });
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
  
  async function fetchCarts(page: number, tab: string, brand: string) {
    setIsLoading(true);
    const filters = { listTab: tab, brand_name: brand };
    const { data, count } = await getAssignedCarts('all', page, pageSize, filters);
    
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
    fetchCarts(currentPage, activeListTab, selectedBrand);
  }, [currentPage, activeListTab, selectedBrand, refreshTrigger]);

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
    loadHistory();
  }, [selectedCustomer?.id]);

  const formatCurrency = (val: any) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString()}`;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  };
  
  const getDaysAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] -m-4 md:-m-6 font-sans">
      
      {/* Top Header */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="ml-10">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Abandoned Cart Calling</h1>
          <p className="text-sm text-slate-500 font-medium">Turn abandoned carts into happy customers</p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm transition-colors border border-slate-200 bg-white text-slate-700 shadow-sm font-medium h-10 px-4 min-w-[200px] justify-start hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              <CalendarIcon className="w-4 h-4 mr-2 text-slate-500" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
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
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer outline-none bg-transparent border-t-0 border-r-0 border-b-0 m-0 p-0 hover:bg-transparent">
              <div className="flex items-center gap-3 pl-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                  <img src="https://i.pravatar.cc/150?u=admin" alt="Admin" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-tight">Aman Sharma</p>
                  <p className="text-xs font-medium text-slate-500 leading-tight">Admin</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Padding */}
      <div className="p-8 flex-1 flex flex-col max-w-[1800px] w-full mx-auto">
        
        {/* 3-Pane Unified Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-1 overflow-hidden min-h-[700px]">
          
          {/* Left Pane - Filters */}
          <div className={`shrink-0 flex flex-col transition-all duration-300 border-r border-slate-100 bg-white ${isFiltersCollapsed ? 'w-[70px]' : 'w-[280px]'}`}>
            {!isFiltersCollapsed ? (
              <>
                <div className="p-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[16px] text-slate-900">Filters</h3>
                      <button onClick={() => setIsFiltersCollapsed(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <button className="text-[13px] font-bold text-slate-400 hover:text-slate-600 transition-colors">Clear All</button>
                  </div>
                  <div className="relative mb-6">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input 
                      placeholder="Search filters" 
                      className="pl-9 h-11 bg-white border-slate-200 rounded-lg text-[13px] shadow-sm font-medium" 
                    />
                  </div>
                </div>
                <div className="px-6 flex-1 overflow-y-auto custom-scrollbar space-y-5 pb-6">
              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-slate-600">Campaign</label>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-slate-700 shadow-sm rounded-lg font-medium">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="all">All Campaigns</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-slate-600">Abandoned Days</label>
                <Select defaultValue="1-3">
                  <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-slate-700 shadow-sm rounded-lg font-medium">
                    <SelectValue placeholder="1 - 3 days" />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="1-3">1 - 3 days</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-slate-600">Cart Value</label>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-slate-700 shadow-sm rounded-lg font-medium">
                    <SelectValue placeholder="All Values" />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="all">All Values</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-slate-600">Payment Status</label>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-slate-700 shadow-sm rounded-lg font-medium">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-slate-600">Customer Tags</label>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full h-11 bg-white border-slate-200 text-slate-700 shadow-sm rounded-lg font-medium">
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="all">All Tags</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-6 pt-0 mt-auto">
              <Button className="w-full h-12 bg-[#7B5EE4] hover:bg-[#684bd3] text-white font-bold rounded-xl shadow-md text-[14px]">
                Apply Filters
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center py-6 h-full bg-slate-50 border-t border-slate-100">
            <button onClick={() => setIsFiltersCollapsed(false)} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm rounded-xl text-slate-500 hover:text-[#7B5EE4] transition-all" title="Expand Filters">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

          {/* Removed duplicate border */}

          {/* Middle Pane - List */}
          <div className="flex-1 flex flex-col min-w-[650px]">
            {/* List Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto custom-scrollbar pt-2 shrink-0">
              {[
                { id: 'all', label: 'All Carts' },
                { id: 'calls', label: 'Calls to Make' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Completed' },
                { id: 'not_interested', label: 'Not Interested' }
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
            
            {/* List Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-white">
              <div className="col-span-1 flex items-center justify-center"><Checkbox className="w-4 h-4 rounded" /></div>
              <div className="col-span-3 text-[12px] font-bold text-slate-500">Customer</div>
              <div className="col-span-2 text-[12px] font-bold text-slate-500">Cart Value</div>
              <div className="col-span-2 text-[12px] font-bold text-slate-500">Abandoned</div>
              <div className="col-span-1 text-[12px] font-bold text-slate-500 text-center">Priority</div>
              <div className="col-span-2 text-[12px] font-bold text-slate-500">Agent</div>
              <div className="col-span-1 text-[12px] font-bold text-slate-500 text-center">Action</div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[12px] shrink-0">
                        {getInitials(c.customer_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{c.customer_name || 'Unknown'}</p>
                        <p className="text-[12px] font-medium text-slate-500 truncate">{c.customer_phone || c.customer_email}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[14px] font-bold text-slate-900">{formatCurrency(c.cart_value)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[13px] font-bold text-slate-900">{getDaysAgo(c.abandoned_at)}</p>
                      <p className="text-[12px] font-medium text-slate-500">{formatDateTime(c.abandoned_at).split(', ')[1] || ''}</p>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Badge variant="outline" className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${prio.color}`}>
                        {prio.label}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[13px] font-bold text-slate-900 truncate">{c.agent_name || 'Unassigned'}</p>
                      <p className="text-[12px] font-medium text-slate-500 truncate">{c.assignment_status || 'Pending'}</p>
                    </div>
                    <div className="col-span-1 flex items-center justify-center gap-2">
                      <button className="w-8 h-8 rounded-full bg-[#F4F1FD] text-[#7B5EE4] flex items-center justify-center hover:bg-[#EAE4FC] transition-colors">
                        <PhoneCall className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {customers.length === 0 && !isLoading && (
                <div className="p-12 text-center text-slate-500 font-medium">No carts found.</div>
              )}
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

          <div className="w-px bg-slate-200 shrink-0"></div>

          {/* Right Pane - Details */}
          <div className="w-[520px] shrink-0 flex flex-col bg-white">
            {selectedCustomer ? (
              <>
                {/* Profile Block */}
                <div className="p-8 pb-0">
                  <div className="flex justify-between items-start mb-8 gap-4">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl shrink-0">
                        {getInitials(selectedCustomer.customer_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-[18px] font-bold text-slate-900 leading-none truncate">{selectedCustomer.customer_name || 'Unknown'}</h2>
                          <Badge className={`shrink-0 border-none text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getPriority(selectedCustomer.cart_value || 0).color}`}>
                            {getPriority(selectedCustomer.cart_value || 0).label} Priority
                          </Badge>
                        </div>
                        <p className="text-[13px] font-medium text-slate-500 flex items-center gap-2 mb-1 mt-2 truncate">
                          <PhoneCall className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{selectedCustomer.customer_phone || 'N/A'}</span>
                        </p>
                        <p className="text-[13px] font-medium text-slate-500 flex items-center gap-2 mb-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{[selectedCustomer.city, selectedCustomer.state, selectedCustomer.country].filter(Boolean).join(', ') || 'Unknown Location'}</span>
                        </p>
                        <p className="text-[13px] font-medium text-slate-500 flex items-center gap-2 truncate">
                          <ShoppingCart className="w-3.5 h-3.5 shrink-0" /> 
                          <span className="truncate">
                            {selectedCustomer.brand_name || 'Unknown Brand'} 
                            {' • '} 
                            {selectedCustomer.source ? selectedCustomer.source.charAt(0).toUpperCase() + selectedCustomer.source.slice(1) : (providers.find(p => p.id === selectedCustomer.provider_id)?.name || 'Unknown Provider')}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] text-slate-500 mb-0.5 font-medium">Cart Value</p>
                      <p className="text-[18px] font-bold text-slate-900 mb-3">{formatCurrency(selectedCustomer.cart_value)}</p>
                      <p className="text-[13px] text-slate-500 mb-0.5 font-medium">Abandoned</p>
                      <p className="text-[13px] font-medium text-slate-900 mb-0.5">{formatDateTime(selectedCustomer.abandoned_at)}</p>
                      <p className="text-[12px] text-slate-500 font-medium">{getDaysAgo(selectedCustomer.abandoned_at)}</p>
                    </div>
                  </div>
                  
                  {/* Detail Tabs */}
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar border-b border-slate-100 pb-px">
                    {['Cart Details', 'Customer Info', 'Call Script', 'History', 'Activity', 'Notes'].map(tab => {
                      const tabId = tab.split(' ')[1] ? tab.split(' ')[1].toLowerCase() : tab.split(' ')[0].toLowerCase();
                      const isActive = activeDetailTab === tabId || (tabId === 'script' && activeDetailTab === 'script');
                      return (
                        <button 
                          key={tab}
                          onClick={() => setActiveDetailTab(tabId)}
                          className={`px-4 py-3 text-[14px] font-bold whitespace-nowrap transition-colors border-b-2 ${
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
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {/* Ready to call banner */}
                  <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-5 flex items-center justify-between mb-8 shadow-sm">
                    <div>
                      <p className="text-[14px] font-bold text-[#16A34A] flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-5 h-5" /> Ready to Call
                      </p>
                      <p className="text-[13px] font-medium text-[#15803D]">Customer is available. You can start the call.</p>
                    </div>
                    <Button className="bg-[#7B5EE4] hover:bg-[#684bd3] text-white shadow-md rounded-xl font-bold h-12 px-6 flex items-center gap-2 transition-colors text-[14px]">
                      <PhoneCall className="w-4 h-4 fill-white" /> Start Call
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
                    <div className="space-y-6">
                      <h3 className="font-bold text-[16px] text-slate-900 mb-2">Customer Information</h3>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                          <p className="text-[12px] text-slate-500 font-bold mb-1">Email Address</p>
                          <p className="text-[14px] text-slate-900 font-medium">{selectedCustomer.customer_email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[12px] text-slate-500 font-bold mb-1">Phone Number</p>
                          <p className="text-[14px] text-slate-900 font-medium">{selectedCustomer.customer_phone || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[12px] text-slate-500 font-bold mb-1">Shipping Address</p>
                          <p className="text-[14px] text-slate-900 font-medium leading-relaxed">
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
                          <div className="flex gap-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 flex-1 overflow-hidden flex items-center">
                              <p className="text-[13px] text-slate-600 truncate">{selectedCustomer.checkout_url}</p>
                            </div>
                            <Button 
                              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-md px-4 text-[13px] shrink-0" 
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
                      <h3 className="font-bold text-[16px] text-slate-900 mb-2">Activity Log</h3>
                      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <p className="text-[13px] font-bold text-slate-500 mb-1">No Recent Activity</p>
                        <p className="text-[12px] text-slate-400 text-center max-w-[250px]">Activity events like calls, SMS, and status changes will appear here.</p>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'history' && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-[16px] text-slate-900 mb-4">Previous Carts</h3>
                      {isLoadingHistory ? (
                        <div className="text-center p-8 text-sm text-slate-500">Loading history...</div>
                      ) : customerHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                          <p className="text-[13px] font-bold text-slate-500 mb-1">No Past Carts</p>
                          <p className="text-[12px] text-slate-400 text-center max-w-[250px]">This customer has no other abandoned carts.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerHistory.map(histCart => (
                            <div key={histCart.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2 relative">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[13px] text-slate-800 font-bold mb-0.5">{histCart.brand_name || 'Unknown Brand'}</p>
                                  <p className="text-[12px] text-slate-500 font-medium">{formatDateTime(histCart.abandoned_at)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[14px] text-slate-900 font-bold mb-0.5">{formatCurrency(histCart.cart_value)}</p>
                                  <Badge className={`shrink-0 border-none text-[10px] font-bold px-2 py-0 rounded-sm ${histCart.cart_status === 'RECOVERED' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                                    {histCart.cart_status}
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
                      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <p className="text-[13px] font-bold text-slate-500 mb-1">No Notes</p>
                        <p className="text-[12px] text-slate-400 text-center max-w-[250px]">Click 'Add Note' in the quick actions to leave a note.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="h-px bg-slate-100 my-8"></div>
                </div>

                {/* Quick Actions Footer */}
                <div className="p-8 pt-0 bg-white shrink-0">
                  <p className="text-[14px] font-bold text-slate-900 mb-4">Quick Actions</p>
                  <div className="flex flex-nowrap gap-2">
                    <Button variant="outline" className="flex-1 bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-9 px-1 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                      <MessageCircle className="w-4 h-4 text-[#16A34A] shrink-0" /> Send WhatsApp
                    </Button>
                    <Button variant="outline" className="flex-1 bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-9 px-1 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                      <MessageSquare className="w-4 h-4 text-slate-500 shrink-0" /> Send SMS
                    </Button>
                    <Button variant="outline" className="flex-1 bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-9 px-1 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" /> Email Cart
                    </Button>
                    <Button variant="outline" className="flex-1 bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 h-9 px-1 text-[12px] font-medium shadow-none rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
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

      </div>
    </div>
  );
}
