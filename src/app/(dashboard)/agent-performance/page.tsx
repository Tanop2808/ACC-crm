"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Target, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AgentPerformancePage() {
  const [performers, setPerformers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [floorAvg, setFloorAvg] = useState("0.0%");
  const [timeFilter, setTimeFilter] = useState("all_time");

  useEffect(() => {
    async function fetchAgents() {
      setIsLoading(true);
      // Fetch real data from our new RPC function with time filter
      const { data, error } = await (supabase as any).rpc('get_agent_performance', { p_time_filter: timeFilter });
      
      if (data && data.length > 0) {
        let globalTotal = 0;
        let globalRecovered = 0;

        let filteredData = data;
        const sessionRole = typeof window !== 'undefined' ? localStorage.getItem('session_role') : null;
        const sessionEmail = typeof window !== 'undefined' ? localStorage.getItem('session_email') : null;

        if (sessionRole === 'agent' && sessionEmail) {
          filteredData = data.filter((a: any) => a.agent_email === sessionEmail);
        }

        const mapped = filteredData.map((agent: any, i: number) => {
          const totalCarts = parseInt(agent.total_carts) || 0;
          const recoveredCarts = parseInt(agent.recovered_carts) || 0;
          const recoveredRevenue = parseFloat(agent.recovered_revenue) || 0;
          const convRate = totalCarts > 0 ? ((recoveredCarts / totalCarts) * 100).toFixed(1) : "0.0";
          
          globalTotal += totalCarts;
          globalRecovered += recoveredCarts;

          return {
            rank: i + 1,
            name: agent.agent_name || agent.agent_email.split('@')[0],
            conv: `${convRate}%`,
            rev: `₹${recoveredRevenue.toLocaleString()}`,
            carts: totalCarts,
          }
        });
        
        setPerformers(mapped);
        
        const avg = globalTotal > 0 ? ((globalRecovered / globalTotal) * 100).toFixed(1) : "0.0";
        setFloorAvg(`${avg}%`);
      } else {
        // Fallback if no agents exist
        setPerformers([
           { rank: 1, name: "No data available", conv: "0%", rev: "₹0", carts: 0 }
        ]);
        setFloorAvg("0.0%");
      }
      setIsLoading(false);
    }
    fetchAgents();
  }, [timeFilter]);

  const timeFilterLabels: Record<string, string> = {
    all_time: "All Time",
    yesterday: "Yesterday",
    last_week: "Last 7 Days",
    last_month: "Last 30 Days"
  };

  const handleExport = () => {
    if (!performers || performers.length === 0 || performers[0].name === "No data available") return;
    const csvHeader = "Rank,Agent Name,Conversion Rate,Revenue Recovered,Total Carts\n";
    const csvContent = performers.map(p => 
      `${p.rank},"${p.name}","${p.conv}","${p.rev.replace(/,/g, '')}",${p.carts}`
    ).join("\n");
    
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `agent_performance_${timeFilter}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Agent Performance</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Leaderboards, conversion metrics, and shift analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={(val) => setTimeFilter(val || "all_time")}>
            <SelectTrigger className="w-[180px] bg-white h-10 font-bold rounded-lg shadow-sm">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} sideOffset={4}>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="yesterday" spellCheck={false}>Yesterday</SelectItem>
              <SelectItem value="last_week">Last 7 Days</SelectItem>
              <SelectItem value="last_month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 px-4 font-bold rounded-lg shadow-sm" onClick={handleExport}>
            Download Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F59E0B]" />
                Top Performers ({timeFilterLabels[timeFilter]})
              </h3>
            </div>
            <div className="p-0">
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                performers.map((agent, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 px-6 border-b border-border/50 last:border-0 ${i === 0 ? 'bg-primary/5' : 'hover:bg-muted/10'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] ${i === 0 ? 'bg-[#F59E0B] text-white' : 'bg-muted text-muted-foreground'}`}>
                        {agent.rank}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-foreground">{agent.name}</p>
                        <p className="text-[12px] text-muted-foreground">{agent.carts} carts handled</p>
                      </div>
                    </div>
                    <div className="flex gap-8 text-right">
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Conv. Rate</p>
                        <p className={`text-[15px] font-extrabold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>{agent.conv}</p>
                      </div>
                      <div className="w-24">
                        <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Revenue</p>
                        <p className="text-[15px] font-extrabold text-[#166534]">{agent.rev}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <TrendingUp className="w-6 h-6 mb-4 opacity-80" />
              <p className="text-[11px] font-bold tracking-[0.12em] opacity-80 uppercase">Floor Average Conv. Rate</p>
              <h3 className="text-4xl font-extrabold mt-2">{floorAvg}</h3>
              <p className="text-[13px] font-bold mt-2 opacity-90">Based on assigned carts</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <Target className="w-6 h-6 mb-4 text-muted-foreground" />
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Target Hit Rate</p>
              <h3 className="text-4xl font-extrabold text-foreground mt-2">N/A</h3>
              <p className="text-[13px] font-bold text-muted-foreground mt-2">Requires target configuration</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
