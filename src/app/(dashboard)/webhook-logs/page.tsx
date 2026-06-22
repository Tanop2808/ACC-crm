import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, RefreshCw } from "lucide-react";

export default function WebhookLogsPage() {
  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Webhook Logs</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Real-time incoming payloads from connected integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 px-4 font-bold rounded-lg shadow-sm bg-card text-foreground">
            <RefreshCw className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
        </div>
      </div>

      <Card className="flex-1 shadow-sm border-border bg-[#0D0D1A] overflow-hidden flex flex-col min-h-[600px] text-[#A1A1AA] font-mono text-[13px]">
        <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-[#181825]">
          <div className="flex items-center gap-2 text-white">
            <Terminal className="w-4 h-4" />
            <span className="font-bold text-[12px] tracking-widest uppercase opacity-80">Terminal Output</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Listening
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 leading-relaxed">
          <div>
            <div className="flex gap-2 text-[#60A5FA]">
              <span className="text-[#A1A1AA]">[14:22:10]</span> <span>POST</span> /api/webhooks/shopify/carts/create <span className="text-green-400">200 OK</span>
            </div>
            <div className="pl-24 mt-1 opacity-80">
              {"{"} <br/>
              &nbsp;&nbsp;"id": "CRT-98210",<br/>
              &nbsp;&nbsp;"customer_email": "j.dalton@enterprise.com",<br/>
              &nbsp;&nbsp;"total_price": "124.50",<br/>
              &nbsp;&nbsp;"currency": "USD"<br/>
              {"}"}
            </div>
          </div>
          
          <div>
            <div className="flex gap-2 text-[#60A5FA]">
              <span className="text-[#A1A1AA]">[14:23:45]</span> <span>POST</span> /api/webhooks/stripe/payment_intent.succeeded <span className="text-green-400">200 OK</span>
            </div>
            <div className="pl-24 mt-1 opacity-80">
              {"{"} <br/>
              &nbsp;&nbsp;"id": "pi_3MtwBwLkdIwHu7ix28a3tqPc",<br/>
              &nbsp;&nbsp;"amount": 12450,<br/>
              &nbsp;&nbsp;"status": "succeeded"<br/>
              {"}"}
            </div>
          </div>
          
          <div>
            <div className="flex gap-2 text-[#60A5FA]">
              <span className="text-[#A1A1AA]">[14:25:00]</span> <span>POST</span> /api/webhooks/twilio/sms/status <span className="text-red-400">500 ERR</span>
            </div>
            <div className="pl-24 mt-1 opacity-80 text-red-400/80">
              Error: Provider timeout on node EU-WEST-1.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
