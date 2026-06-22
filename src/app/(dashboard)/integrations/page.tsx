import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plug, Settings2, CheckCircle2, AlertCircle } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Integrations</h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Connect your e-commerce platforms, payment gateways, and communication channels.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[
          { name: "Shopify", desc: "Sync abandoned carts and orders automatically.", connected: true, status: "Healthy" },
          { name: "WooCommerce", desc: "E-commerce syncing for WordPress sites.", connected: false },
          { name: "Stripe", desc: "Process payments directly through the recovery portal.", connected: true, status: "Healthy" },
          { name: "Twilio", desc: "Enable SMS recovery campaigns and agent auto-dialing.", connected: true, status: "Degraded" },
          { name: "SendGrid", desc: "High-deliverability email infrastructure.", connected: false },
          { name: "Salesforce", desc: "Enterprise CRM synchronization.", connected: false },
        ].map((app, i) => (
          <Card key={i} className="shadow-sm border-border hover:shadow-md transition-shadow relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Plug className="w-6 h-6 text-muted-foreground" />
                </div>
                {app.connected ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-tight">
                    Connected
                  </span>
                ) : (
                  <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold">Connect</Button>
                )}
              </div>
              <h3 className="text-[17px] font-bold text-foreground">{app.name}</h3>
              <p className="text-[13px] text-muted-foreground mt-1 min-h-[40px]">{app.desc}</p>
              
              {app.connected && (
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {app.status === "Healthy" ? (
                      <CheckCircle2 className="w-4 h-4 text-[#166534]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#92400e]" />
                    )}
                    <span className="text-[12px] font-medium text-foreground">{app.status}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
