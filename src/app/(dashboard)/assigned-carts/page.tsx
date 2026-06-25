"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ExternalLink, Filter, Search, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { 
  getAssignedCarts, 
  getUniqueBrands, 
  getUniqueSources, 
  assignAgentToCart,
  AssignedCartMaster 
} from "@/services/assignedCartService";
import { getAgents } from "@/services/agentRecoveryService";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AssignedCartsPage() {
  const [carts, setCarts] = useState<AssignedCartMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Filters
  const [brands, setBrands] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Agents for assignment
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const { data: bData } = await getUniqueBrands();
      if (bData) setBrands(bData);
      
      const { data: sData } = await getUniqueSources();
      if (sData) setSources(sData);

      const { data: aData } = await getAgents();
      if (aData) setAgents(aData);
    }
    init();
  }, []);

  const fetchCarts = async () => {
    setIsLoading(true);
    const filters = {
      brand_name: selectedBrand,
      source: selectedSource
    };
    
    const { data, count } = await getAssignedCarts(currentPage, pageSize, filters);
    if (data) {
      setCarts(data);
    }
    if (count !== null) {
      setTotalCount(count);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCarts();
  }, [currentPage, selectedBrand, selectedSource]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('abandoned-cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'abandon_cart_master'
        },
        (payload) => {
          // Instead of manually merging complex pagination state, 
          // we can just re-fetch the current page to ensure accuracy
          fetchCarts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, selectedBrand, selectedSource]); // Re-bind if page changes

  const handleAssignAgent = async (cartId: string, source: string | null, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    // Optimistic UI update
    setCarts(prev => prev.map(c => 
      c.id === cartId 
        ? { ...c, agent_id: agentId, agent_name: agent.name, assignment_status: 'ASSIGNED' } 
        : c
    ));

    const { error } = await assignAgentToCart(cartId, source, agentId, agent.name);
    if (error) {
      // Revert on error
      fetchCarts();
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-slate-100 text-slate-700";
    switch(status.toUpperCase()) {
      case 'RECOVERED': return "bg-green-100 text-green-700";
      case 'ABANDONED': return "bg-amber-100 text-amber-700";
      case 'ASSIGNED': return "bg-blue-100 text-blue-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const filteredCarts = carts.filter(cart => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (cart.customer_name?.toLowerCase() || "").includes(query) ||
      (cart.customer_email?.toLowerCase() || "").includes(query) ||
      (cart.customer_phone?.toLowerCase() || "").includes(query) ||
      (cart.cart_id?.toLowerCase() || "").includes(query)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] -m-4 md:-m-6 font-sans">
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="ml-10">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Assigned Carts</h1>
          <p className="text-sm text-slate-500 font-medium">Manage and assign abandoned carts to agents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search customers..." 
              className="pl-9 h-10 border-slate-200 focus-visible:ring-[#7B5EE4]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={selectedBrand} onValueChange={(val) => { setSelectedBrand(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] h-10 border-slate-200">
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

          <Select value={selectedSource} onValueChange={(val) => { setSelectedSource(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] h-10 border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="truncate">{selectedSource === 'all' ? 'All Providers' : selectedSource.charAt(0).toUpperCase() + selectedSource.slice(1)}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {sources.map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="p-8 flex-1 w-full mx-auto max-w-[1800px]">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-160px)]">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 py-4 pl-6">Customer</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">Brand / Source</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">Cart Value</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">Abandoned At</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4">Assigned Agent</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-4 text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-slate-500">Loading carts...</TableCell>
                  </TableRow>
                ) : filteredCarts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-slate-500">No carts found</TableCell>
                  </TableRow>
                ) : (
                  filteredCarts.map((cart) => (
                    <TableRow key={cart.id} className="hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-4">
                        <div className="font-medium text-slate-900">{cart.customer_name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-1">{cart.customer_email || cart.customer_phone || 'No contact info'}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="font-medium text-slate-900">{cart.brand_name || 'Unknown Brand'}</div>
                        <div className="text-xs text-slate-500 mt-1 capitalize">{cart.source || 'Unknown'}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="font-medium text-slate-900">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: cart.currency || 'INR' }).format(cart.cart_value || 0)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {cart.products ? (Array.isArray(cart.products) ? cart.products.length : 1) : 0} items
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-slate-600 text-sm">
                        {cart.abandoned_at ? format(new Date(cart.abandoned_at), "MMM d, yyyy h:mm a") : 'N/A'}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary" className={`${getStatusColor(cart.cart_status)} border-none shadow-none`}>
                          {cart.cart_status || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 px-2 flex items-center gap-2 hover:bg-slate-100 data-[state=open]:bg-slate-100">
                              {cart.agent_name ? (
                                <span className="font-medium text-slate-700">{cart.agent_name}</span>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                              <UserPlus className="w-4 h-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>Assign Agent</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {agents.map(agent => (
                              <DropdownMenuItem 
                                key={agent.id} 
                                onClick={() => handleAssignAgent(cart.id, cart.source, agent.id)}
                                className={cart.agent_id === agent.id ? "bg-slate-100 font-medium" : ""}
                              >
                                {agent.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        {cart.checkout_url ? (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-[#7B5EE4] hover:bg-[#684bd3] text-white shadow-sm"
                            onClick={() => window.open(cart.checkout_url as string, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> Recover Cart
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            No URL
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <p className="text-sm text-slate-500 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
            </p>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8 border-slate-200 text-slate-600"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
              ><ChevronLeft className="w-4 h-4" /></Button>
              <div className="w-10 text-center text-sm font-semibold text-slate-700">
                {currentPage}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8 border-slate-200 text-slate-600"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * pageSize >= totalCount || isLoading}
              ><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
