"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin, Mail, Phone, Calendar, ShoppingCart, Clock, AlertCircle, CalendarCheck, CheckCircle2, ShoppingBag, History, Loader2, Globe, CreditCard } from "lucide-react";
import { getCustomers } from "@/services/customerService";

export default function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [cartDialogCustomer, setCartDialogCustomer] = useState<any>(null);

  const [customersData, setCustomersData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await getCustomers();
      
      if (err) {
        setError(err.message);
      } else if (data) {
        const mappedData = data.map((item: any) => {
          let products = [];
          if (Array.isArray(item.products)) {
            products = item.products;
          } else if (typeof item.products === 'string') {
            try {
              products = JSON.parse(item.products);
            } catch (e) {
              products = [];
            }
          }

          const cartDetailsStr = products.length > 0 
            ? products.map((p: any) => p.name || p.product_name || p.title || p.item_name || 'Unknown Product').join(', ') 
            : 'Unknown items';

          let dateTimeStr = 'N/A';
          if (item.abandoned_at) {
            let dateStr = item.abandoned_at;
            // Convert 'YYYY-MM-DD HH:MM:SS' to 'YYYY-MM-DDTHH:MM:SS'
            if (dateStr.includes(' ') && !dateStr.includes('T')) {
              dateStr = dateStr.replace(' ', 'T');
            }
            // If it lacks 'Z' and lacks a timezone offset at the end (like +00:00 or -05:00), append 'Z'
            if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
              dateStr += 'Z';
            }
            const date = new Date(dateStr);
            const formatter = new Intl.DateTimeFormat('en-US', {  
              timeZone: 'Asia/Kolkata',
              day: 'numeric', month: 'short', year: 'numeric',
              hour: 'numeric', minute: '2-digit', hour12: true 
            });
            dateTimeStr = formatter.format(date).replace(',', '');
          }

          return {
            ...item,
            name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
            email: item.email || 'N/A',
            phone: item.phone || 'N/A',
            location: 'N/A', 
            source: item.source || 'N/A',
            provider: item.provider || 'N/A',
            cartStatus: item.follow_up || 'Pending',
            cartStatusColor: "bg-[#E0E7FF] text-[#1e40af]", 
            cartValue: item.cart_value ? `₹${item.cart_value.toLocaleString()}` : '₹0',
            totalOrders: 0,
            totalSpent: '₹0',
            lastActivity: item.recovery_status || 'Not Recovered',
            customerSince: 'N/A',
            cartId: item.cart_id || 'N/A',
            dateTime: dateTimeStr,
            cartDetails: cartDetailsStr,
            cartItems: products
          };
        });
        setCustomersData(mappedData);
      }
      setIsLoading(false);
    }
    
    loadCustomers();
  }, []);

  const uniqueSources = Array.from(new Set(customersData.map((row) => row.source).filter(Boolean)));
  const uniqueProviders = Array.from(new Set(customersData.map((row) => row.provider).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(customersData.map((row) => row.lastActivity).filter(Boolean)));

  const filteredCustomers = customersData.filter((row) => {
    const matchesSource = sourceFilter === "all" || row.source === sourceFilter;
    const matchesProvider = providerFilter === "all" || row.provider === providerFilter;
    const matchesStatus = statusFilter === "all" || row.lastActivity === statusFilter;
    
    if (!matchesSource || !matchesProvider || !matchesStatus) return false;
    if (!searchQuery) return true;
    
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (row.name && row.name.toLowerCase().includes(lowerQuery)) ||
      (row.email && row.email.toLowerCase().includes(lowerQuery)) ||
      (row.phone && row.phone.toLowerCase().includes(lowerQuery)) ||
      (row.cartDetails && row.cartDetails.toLowerCase().includes(lowerQuery))
    );
  });

  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Customers</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Complete customer history, recovery status, and cart data.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search */}
        <div className="flex items-center bg-card border border-border focus-within:border-primary transition-all rounded-md px-3 h-10 w-full md:w-[400px]">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <Input 
            className="bg-transparent border-none focus:ring-0 text-[13px] w-full outline-none font-medium placeholder:text-muted-foreground" 
            placeholder="Search name, email, phone, or cart ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-md text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary capitalize"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map((source: any) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-md text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary capitalize"
          >
            <option value="all">All Providers</option>
            {uniqueProviders.map((provider: any) => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
          <div className="w-[1px] h-6 bg-border mx-1 hidden lg:block"></div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-md text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary capitalize"
          >
            <option value="all">All Statuses</option>
            {uniqueStatuses.map((status: any) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Full Width Table */}
      <Card className="flex-1 shadow-sm overflow-hidden border-border flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="font-medium text-[14px]">Loading customers from Supabase...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-destructive">
            <AlertCircle className="w-8 h-8 mb-4" />
            <p className="font-medium text-[14px] text-center max-w-md">Failed to load customers: {error}</p>
            <p className="text-[12px] mt-2 opacity-80">Make sure your Supabase environment variables are set in .env.local</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
            <User className="w-8 h-8 mb-4 opacity-50" />
            <p className="font-medium text-[14px]">{searchQuery ? "No customers found matching your search." : "No customers found in database."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Date & Time</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Customer Name</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Source</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Provider</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Cart Details</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Cart Value</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Recovery Status</TableHead>
                <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((row, i) => (
                <TableRow key={i} className="hover:bg-muted/30 border-border h-[72px]">
                  <TableCell className="px-6 font-medium text-[13px] text-muted-foreground whitespace-nowrap">
                    {row.dateTime.split(', ')[0]}<br />
                    <span className="text-[11px]">{row.dateTime.split(', ')[1]}</span>
                  </TableCell>
                  <TableCell className="px-6">
                    <p className="font-bold text-[15px] text-foreground whitespace-nowrap">{row.name}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{row.email}</p>
                  </TableCell>
                  <TableCell className="px-6 font-medium text-[13px] text-foreground capitalize">
                    {row.source}
                  </TableCell>
                  <TableCell className="px-6 font-medium text-[13px] text-foreground capitalize">
                    {row.provider}
                  </TableCell>
                  <TableCell className="px-6 font-medium text-[13px] text-foreground max-w-[250px] truncate">
                    <button 
                      className="text-primary hover:underline text-left truncate w-full cursor-pointer focus:outline-none"
                      onClick={() => setCartDialogCustomer(row)}
                    >
                      {row.cartDetails}
                    </button>
                  </TableCell>
                  <TableCell className="px-6 font-extrabold text-[15px] text-foreground">{row.cartValue}</TableCell>
                  <TableCell className="px-6">
                    <Badge variant="outline" className={row.lastActivity === "Recovered" ? "bg-[#DCFCE7]/50 text-[#166534] border-[#166534]/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                      {row.lastActivity}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <Button size="sm" className="font-bold bg-primary/10 text-primary hover:bg-primary/20 shadow-none px-4" onClick={() => setSelectedCustomer(row)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </Card>

      {/* Customer 360 Dialog Popup */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="w-[95vw] sm:max-w-7xl lg:max-w-[1400px] max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col p-0 border-border bg-background custom-scrollbar">
          <DialogHeader className="px-6 py-5 border-b border-border bg-muted/10 shrink-0 sticky top-0 z-10 backdrop-blur-md">
            <DialogTitle className="text-2xl font-extrabold text-foreground flex items-center justify-between">
              Customer 360: {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Profile & Follow-Up (Narrower) */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              
              {/* 1. Customer Profile Card */}
              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="px-6 py-4 border-b border-border bg-muted/20">
                  <CardTitle className="text-[14px] font-bold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> Customer Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4 border-b border-border pb-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                      <span className="text-lg font-extrabold text-primary">{selectedCustomer?.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-foreground">{selectedCustomer?.name}</h2>
                      <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> Since {selectedCustomer?.customerSince}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[13px]">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{selectedCustomer?.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{selectedCustomer?.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{selectedCustomer?.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] pt-2 border-t border-border mt-2">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground capitalize">{selectedCustomer?.source}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest ml-auto">Source</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground capitalize">{selectedCustomer?.provider}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest ml-auto">Provider</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Follow-Up Information Card */}
              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="px-6 py-4 border-b border-border bg-muted/20">
                  <CardTitle className="text-[14px] font-bold text-foreground flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4" /> Follow-Up Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Next Follow-Up</p>
                      <p className="text-[14px] font-bold text-foreground">Tomorrow, 4:30 PM</p>
                    </div>
                    <Badge variant="secondary" className="bg-[#E0E7FF] text-[#1e40af] font-bold">Scheduled</Badge>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Assigned Agent</p>
                    <div className="text-[13px] text-foreground font-medium flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">A</div>
                      Agent Michael
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Middle & Right Column: Cart Status, History, Timeline */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              
              {/* 3. Cart Status Card */}
              <Card className="shadow-sm border-border bg-card border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-xl text-primary"><ShoppingCart className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-[15px] font-bold text-foreground">Current Cart Status</h3>
                        <p className="text-[13px] text-muted-foreground mt-0.5">ID: {selectedCustomer?.cartId}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[12px] font-bold tracking-widest px-3 py-1 uppercase ${selectedCustomer?.cartStatusColor}`}>
                      {selectedCustomer?.cartStatus}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Recovery Stage</p>
                      <p className="text-[14px] font-extrabold text-foreground">Day 2</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Cart Value</p>
                      <p className="text-[14px] font-extrabold text-[#166534]">{selectedCustomer?.cartValue}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Last Action</p>
                      <p className="text-[13px] font-medium text-foreground truncate" title={selectedCustomer?.lastActivity}>{selectedCustomer?.lastActivity}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Next Action</p>
                      <p className="text-[13px] font-medium text-foreground">Call Attempt 2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Abandoned Cart History Card */}
              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="px-6 py-4 border-b border-border bg-muted/20">
                  <CardTitle className="text-[14px] font-bold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4" /> Abandoned Cart History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Cart ID</TableHead>
                        <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Date</TableHead>
                        <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Products</TableHead>
                        <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Value</TableHead>
                        <TableHead className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase h-10 px-6">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-border">
                        <TableCell className="px-6 font-mono text-[12px] text-foreground">{selectedCustomer?.cartId}</TableCell>
                        <TableCell className="px-6 text-[13px] text-muted-foreground">Oct 24, 2024</TableCell>
                        <TableCell className="px-6 text-[13px] font-medium text-foreground max-w-[200px] truncate">iPhone 15 Pro Cover (x2), Charger</TableCell>
                        <TableCell className="px-6 font-bold text-[13px] text-foreground">{selectedCustomer?.cartValue}</TableCell>
                        <TableCell className="px-6">
                          <Badge variant="outline" className="bg-[#FEF3C7]/50 text-[#92400e] border-[#92400e]/20 text-[10px]">Active</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border">
                        <TableCell className="px-6 font-mono text-[12px] text-foreground">CRT-10024X</TableCell>
                        <TableCell className="px-6 text-[13px] text-muted-foreground">Aug 12, 2023</TableCell>
                        <TableCell className="px-6 text-[13px] font-medium text-foreground max-w-[200px] truncate">AirPods Pro</TableCell>
                        <TableCell className="px-6 font-bold text-[13px] text-foreground">₹24,900</TableCell>
                        <TableCell className="px-6">
                          <Badge variant="outline" className="bg-[#DCFCE7]/50 text-[#166534] border-[#166534]/20 text-[10px]">Recovered</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 5. Activity Timeline Card */}
              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="px-6 py-4 border-b border-border bg-muted/20">
                  <CardTitle className="text-[14px] font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative border-l-2 border-border ml-3 space-y-8 py-2">
                    <div className="relative pl-6">
                      <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full -left-[9px] top-1" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-bold text-foreground">Follow-Up Scheduled</p>
                        <p className="text-[11px] font-medium text-muted-foreground">Today, 11:15 AM</p>
                        <p className="text-[12px] text-muted-foreground mt-2 italic bg-muted/30 p-3 rounded border border-border">"Customer requested callback tomorrow evening."</p>
                      </div>
                    </div>

                    <div className="relative pl-6">
                      <div className="absolute w-4 h-4 bg-background border-2 border-destructive rounded-full -left-[9px] top-1" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-bold text-foreground">Call Attempt (No Answer)</p>
                        <p className="text-[11px] font-medium text-muted-foreground">Today, 11:10 AM</p>
                      </div>
                    </div>

                    <div className="relative pl-6">
                      <div className="absolute w-4 h-4 bg-background border-2 border-destructive rounded-full -left-[9px] top-1" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-bold text-foreground">Cart Abandoned</p>
                        <p className="text-[11px] font-medium text-muted-foreground">Today, 10:30 AM</p>
                      </div>
                    </div>

                    <div className="relative pl-6">
                      <div className="absolute w-4 h-4 bg-[#DCFCE7] border-2 border-[#166534] rounded-full -left-[9px] top-1 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-bold text-foreground">Previous Recovery Success</p>
                        <p className="text-[11px] font-medium text-muted-foreground">Aug 14, 2023</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Items Dialog Popup */}
      <Dialog open={!!cartDialogCustomer} onOpenChange={() => setCartDialogCustomer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Cart Items
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {cartDialogCustomer?.cartItems?.map((item: any, index: number) => (
              <div key={item.id || `cart-item-${index}`} className="flex justify-between items-center bg-muted/20 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-foreground">{item.name || item.product_name || item.title || item.item_name || 'Unknown Product'}</p>
                    <p className="text-[12px] font-medium text-muted-foreground">Qty: {item.qty || item.quantity || 1}</p>
                  </div>
                </div>
                <p className="text-[14px] font-extrabold text-foreground shrink-0">{item.price || item.amount || ''}</p>
              </div>
            ))}
            <div className="border-t border-border pt-4 flex justify-between items-center mt-2">
              <p className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">Total Cart Value</p>
              <p className="text-[18px] font-extrabold text-[#166534]">{cartDialogCustomer?.cartValue}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
