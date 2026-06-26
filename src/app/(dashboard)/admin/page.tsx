"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getBrands, createBrand, Brand } from "@/services/adminService";
import { ShoppingBag, Plus, ArrowRight, Layers, UserCheck, Settings2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBrands = async () => {
    setIsLoading(true);
    const { data, error } = await getBrands();
    if (data) setBrands(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    setErrorMsg(null);
    const { data, error } = await createBrand(newBrandName.trim());
    
    if (error) {
      setErrorMsg(error.message || "Failed to create brand.");
    } else if (data) {
      setNewBrandName("");
      setIsCreateOpen(false);
      fetchBrands();
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-8 h-8 text-primary" /> Brand Center
          </h1>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">
            Manage your brand recovery rules, active integrations, and assigned agents.
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="h-10 px-4 font-bold rounded-lg shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Brand
        </Button>
      </div>

      {/* Grid of Brands */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p className="font-medium text-[14px]">Syncing Brands from Supabase...</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-card border border-border border-dashed rounded-2xl min-h-[400px]">
          <ShoppingBag className="w-12 h-12 mb-4 opacity-40 text-primary" />
          <p className="font-bold text-[16px] text-foreground">No Brands Active</p>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px] text-center">
            Create your first brand integration to begin assigning recovery agents.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="mt-6 font-bold" variant="outline">
            Create Brand
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {brands.map((brand) => (
            <Card key={brand.id} className="shadow-sm border-border hover:shadow-md hover:border-primary/30 transition-all group overflow-hidden relative bg-card">
              {/* Subtle top light bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {brand.name.substring(0, 2).toUpperCase()}
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                    Active
                  </Badge>
                </div>
                <CardTitle className="text-lg font-extrabold text-foreground mt-4 group-hover:text-primary transition-colors">
                  {brand.name}
                </CardTitle>
                <CardDescription className="text-[12px] text-muted-foreground truncate">
                  ID: {brand.id}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="h-px bg-border/50" />
                <div className="flex justify-between items-center text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Settings2 className="w-3.5 h-3.5" /> Integration Tokens
                  </span>
                  <span className="font-bold text-foreground">Manage</span>
                </div>
                
                <Link href={`/admin/brands/${brand.id}`} passHref>
                  <Button className="w-full font-bold h-9 mt-2 text-[12px] justify-between shadow-none bg-secondary hover:bg-primary hover:text-white text-foreground transition-all group-hover:translate-x-0">
                    Configure Brand <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Brand Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[420px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Create Brand
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateBrand} className="space-y-4 py-2">
            {errorMsg && (
              <p className="text-[12px] text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-md font-medium">
                {errorMsg}
              </p>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="brandName" className="text-[13px] font-bold">Brand Name</Label>
              <Input
                id="brandName"
                placeholder="e.g. Creatures of Habit"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="font-medium"
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                Create Brand
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple Badge component fallback if needed by next.js imports
function Badge({ className, children, ...props }: any) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  );
}
