import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Target, Users } from "lucide-react";

export default function AgentPerformancePage() {
  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Agent Performance</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Leaderboards, conversion metrics, and shift analytics.</p>
        </div>
        <Button variant="outline" className="h-10 px-4 font-bold rounded-lg shadow-sm">
          Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F59E0B]" />
                Top Performers (This Week)
              </h3>
            </div>
            <div className="p-0">
              {[
                { rank: 1, name: "Sarah Jenkins", conv: "32.4%", rev: "$42,100", carts: 142 },
                { rank: 2, name: "Marcus V.", conv: "28.1%", rev: "$38,450", carts: 120 },
                { rank: 3, name: "David Chen", conv: "26.5%", rev: "$31,200", carts: 105 },
                { rank: 4, name: "Leo Garcia", conv: "24.2%", rev: "$28,900", carts: 98 },
              ].map((agent, i) => (
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
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <TrendingUp className="w-6 h-6 mb-4 opacity-80" />
              <p className="text-[11px] font-bold tracking-[0.12em] opacity-80 uppercase">Floor Average Conv. Rate</p>
              <h3 className="text-4xl font-extrabold mt-2">21.8%</h3>
              <p className="text-[13px] font-bold mt-2 opacity-90">+2.4% vs last week</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <Target className="w-6 h-6 mb-4 text-muted-foreground" />
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Target Hit Rate</p>
              <h3 className="text-4xl font-extrabold text-foreground mt-2">84%</h3>
              <p className="text-[13px] font-bold text-primary mt-2">On track for monthly goal</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
