"use client";

import { useState, useEffect } from "react";
import { use } from "react"; // To unwrap router params in Next.js 15/16
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  getBrandById, 
  getProviders, 
  getBrandIntegrations, 
  createIntegration, 
  getAgentBrandAssignments, 
  assignAgentToBrand, 
  removeAgentFromBrand,
  Brand,
  Provider,
  Integration,
  AgentAssignment
} from "@/services/adminService";
import { 
  ArrowLeft, Cable, Server, Key, UserCheck, Plus, Trash2, 
  Mail, Loader2, Copy, CheckCircle2, ShieldCheck 
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BrandDetailsPage({ params }: PageProps) {
  const { id: brandId } = use(params);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [brandRes, providersRes, integrationsRes, assignmentsRes] = await Promise.all([
      getBrandById(brandId),
      getProviders(),
      getBrandIntegrations(brandId),
      getAgentBrandAssignments(brandId)
    ]);

    if (brandRes.data) setBrand(brandRes.data);
    if (providersRes.data) setProviders(providersRes.data);
    if (integrationsRes.data) setIntegrations(integrationsRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [brandId]);

  const handleSaveIntegration = async () => {
    if (!selectedProviderId) return;
    setIntegrationError(null);
    setIsSavingIntegration(true);

    const { data, error } = await createIntegration(brandId, selectedProviderId);
    if (error) {
      setIntegrationError(error.message || "Failed to create integration.");
    } else {
      // Reload integrations
      const { data: updatedIntegrations } = await getBrandIntegrations(brandId);
      if (updatedIntegrations) setIntegrations(updatedIntegrations);
      setSelectedProviderId("");
    }
    setIsSavingIntegration(false);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignmentError(null);

    const cleanEmail = agentEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith("@datastraw.in")) {
      setAssignmentError("Unauthorized: Only @datastraw.in email addresses can be assigned.");
      return;
    }

    setIsSavingAssignment(true);
    try {
      const { data, error } = await assignAgentToBrand(brandId, agentName.trim(), cleanEmail);
      if (error) {
        setAssignmentError(error.message || "Failed to assign agent.");
      } else {
        // Reload assignments
        const { data: updatedAssignments } = await getAgentBrandAssignments(brandId);
        if (updatedAssignments) setAssignments(updatedAssignments);
        setAgentName("");
        setAgentEmail("");
      }
    } catch (err: any) {
      setAssignmentError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await removeAgentFromBrand(assignmentId);
    if (!error) {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="font-medium text-[14px]">Loading brand configurations...</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-6 text-center text-destructive">
        <h2 className="text-xl font-bold">Brand Not Found</h2>
        <Link href="/admin" className="text-primary hover:underline mt-4 inline-block font-bold">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div>
        <Link 
          href="/admin" 
          className="text-[13px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Brands
        </Link>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{brand.name} Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">Configure automated integrations and agent permissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: Integrations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Integration Token Setup */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="p-6 pb-4 border-b border-border bg-muted/20">
              <CardTitle className="text-[16px] font-bold text-foreground flex items-center gap-2">
                <Cable className="w-4 h-4 text-primary" /> Webhook Integration Setup
              </CardTitle>
              <CardDescription className="text-[12px] text-muted-foreground">
                Connect external providers. System automatically generates sequential identifiers (e.g. brand_provider_001).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {integrationError && (
                <div className="p-3 text-[12px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {integrationError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-[13px] font-bold">Select Cart Provider</Label>
                  <Select value={selectedProviderId} onValueChange={(val) => setSelectedProviderId(val || "")}>
                    <SelectTrigger className="font-medium bg-card border-border">
                      <SelectValue placeholder="Select Provider (e.g. Shopify, Shiprocket)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {providers.map((prov) => (
                        <SelectItem key={prov.id} value={prov.id} className="font-medium">
                          {prov.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSaveIntegration}
                  disabled={isSavingIntegration || !selectedProviderId}
                  className="font-bold h-10 w-full sm:w-auto shadow-sm"
                >
                  {isSavingIntegration ? "Generating..." : "Generate Webhook Token"}
                </Button>
              </div>

              {/* Integrations List */}
              <div className="space-y-3">
                <p className="text-[13px] font-bold text-foreground pt-2">Active Integration Access Tokens</p>
                {integrations.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">No integrations configured yet.</p>
                ) : (
                  <div className="space-y-3">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="bg-muted/30 border border-border p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="space-y-1">
                          <p className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
                            <Server className="w-4 h-4 text-primary shrink-0" />
                            {integration.provider_name} Integration
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="text-[12px] font-mono bg-background px-2 py-0.5 rounded border border-border/80 text-primary">
                              {integration.integration_token}
                            </code>
                            <button
                              onClick={() => copyToClipboard(integration.integration_token || "")}
                              className="text-muted-foreground hover:text-foreground shrink-0 focus:outline-none"
                              title="Copy Integration Token"
                            >
                              {copiedToken === integration.integration_token ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-md sm:max-w-lg">
                            Webhook Target: {integration.webhook_path}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold shrink-0 self-start sm:self-auto">
                          {integration.status || "Active"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Agent Assignments */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="p-6 pb-4 border-b border-border bg-muted/20">
              <CardTitle className="text-[16px] font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> Agent Assignments
              </CardTitle>
              <CardDescription className="text-[12px] text-muted-foreground">
                Assign agents to manage this brand's abandoned carts. Agents must use `@datastraw.in` accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Form to Assign Agent */}
              <form onSubmit={handleSaveAssignment} className="space-y-4">
                {assignmentError && (
                  <div className="p-2.5 text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                    {assignmentError}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <Label htmlFor="agentName" className="text-[12px] font-bold">Agent Name</Label>
                  <Input 
                    id="agentName"
                    placeholder="Enter name"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="font-medium h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agentEmail" className="text-[12px] font-bold">Agent Datastraw Email</Label>
                  <div className="relative">
                    <Input 
                      id="agentEmail"
                      type="email"
                      placeholder="e.g. name@datastraw.in"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      className="font-medium h-9 pr-9"
                      required
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5" />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSavingAssignment}
                  className="w-full font-bold h-9 text-[12px] shadow-sm flex items-center justify-center gap-1"
                >
                  {isSavingAssignment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Assign Agent
                </Button>
              </form>

              <div className="h-px bg-border/50" />

              {/* Assigned Agents List */}
              <div className="space-y-3">
                <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Active Assignments ({assignments.length})
                </p>
                {assignments.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">No agents assigned yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="p-3 bg-muted/40 border border-border rounded-lg flex items-center justify-between gap-3 hover:bg-muted/70 transition-colors">
                        <div className="space-y-0.5 truncate">
                          <p className="text-[13px] font-bold text-foreground truncate">{assignment.agent_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{assignment.agent_email}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          title="Remove Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Badge({ className, children, ...props }: any) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  );
}
