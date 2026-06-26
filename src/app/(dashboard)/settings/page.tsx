"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Bell, Shield, Key, ShieldCheck, UserX, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAdmins, addAdmin, removeAdmin, UserRole } from "@/services/adminService";

export default function SettingsPage() {
  const [name, setName] = useState("Loading...");
  const [email, setEmail] = useState("loading@datastraw.in");
  const [initials, setInitials] = useState("--");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Admin Management State
  const [admins, setAdmins] = useState<UserRole[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const sessionEmail = typeof window !== 'undefined' ? localStorage.getItem('session_email') : null;
      let sessionRole = typeof window !== 'undefined' ? localStorage.getItem('session_role') : null;
      
      if (sessionEmail) {
        setEmail(sessionEmail);

        // Force a live database check to ensure role is completely accurate
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('email', sessionEmail).maybeSingle();
        if (roleData) {
          sessionRole = roleData.role;
          if (typeof window !== 'undefined') localStorage.setItem('session_role', roleData.role);
        }

        if (sessionRole === 'admin') {
          setIsAdminMode(true);
          setName("Admin User");
          setInitials("AD");
        } else {
          // Agent fallback
          const { data } = await supabase.from('agents').select('name').eq('email', sessionEmail).maybeSingle();
          if (data?.name) {
            setName(data.name);
            setInitials(data.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase());
          } else {
            const fallbackName = sessionEmail.split('@')[0];
            setName(fallbackName);
            setInitials(fallbackName.substring(0, 2).toUpperCase());
          }
        }
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (activeTab === "admin" && isAdminMode) {
      loadAdmins();
    }
  }, [activeTab, isAdminMode]);

  async function loadAdmins() {
    setIsLoadingAdmins(true);
    setAdminError(null);
    const { data, error } = await getAdmins();
    if (error) {
      setAdminError(error.message);
    } else {
      setAdmins(data || []);
    }
    setIsLoadingAdmins(false);
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail) return;
    setIsAddingAdmin(true);
    setAdminError(null);
    
    const { error } = await addAdmin(newAdminEmail);
    if (error) {
      setAdminError(error.message);
    } else {
      setNewAdminEmail("");
      await loadAdmins();
    }
    setIsAddingAdmin(false);
  }

  async function handleRemoveAdmin(id: string, adminEmail: string) {
    if (adminEmail === email) {
      setAdminError("You cannot remove your own admin access.");
      return;
    }
    if (confirm(`Are you sure you want to revoke admin access for ${adminEmail}?`)) {
      setAdminError(null);
      const { error } = await removeAdmin(id);
      if (error) {
        setAdminError(error.message);
      } else {
        await loadAdmins();
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h1>
        <p className="text-[15px] font-medium text-muted-foreground mt-1">Manage your terminal preferences and account settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-4">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 space-y-1">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('profile')}
            className={`w-full justify-start font-bold ${activeTab === 'profile' ? 'bg-muted/50' : 'text-muted-foreground'}`}
          >
            <User className="mr-2 w-4 h-4" />
            Profile
          </Button>
          {isAdminMode && (
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('admin')}
              className={`w-full justify-start font-bold ${activeTab === 'admin' ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'}`}
            >
              <ShieldCheck className="mr-2 w-4 h-4" />
              Admin Management
            </Button>
          )}
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <>
              <Card className="shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-[17px] font-bold">Public Profile</CardTitle>
                  <CardDescription className="text-[13px]">This is how others will see you on the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[13px] font-bold">Display Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-md font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[13px] font-bold">Email Address</Label>
                    <Input id="email" value={email} readOnly className="max-w-md bg-muted/50 text-muted-foreground font-medium" />
                    <p className="text-[11px] text-muted-foreground mt-1">Contact your administrator to change your email address.</p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label className="text-[13px] font-bold">Avatar</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary uppercase">
                        {initials}
                      </div>
                      <Button variant="outline" size="sm" className="font-bold">Change Avatar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-[17px] font-bold">Preferences</CardTitle>
                  <CardDescription className="text-[13px]">Customize your control room experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div>
                      <p className="font-bold text-[14px]">Compact Density</p>
                      <p className="text-[12px] text-muted-foreground">Reduce padding to show more data in tables.</p>
                    </div>
                    <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div>
                      <p className="font-bold text-[14px]">Audio Alerts</p>
                      <p className="text-[12px] text-muted-foreground">Play a sound when high priority carts arrive.</p>
                    </div>
                    <div className="w-10 h-5 bg-muted rounded-full relative cursor-pointer border border-border">
                      <div className="w-4 h-4 bg-muted-foreground rounded-full absolute left-0.5 top-[1px]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-bold text-[14px]">Timezone</p>
                      <p className="text-[12px] text-muted-foreground">Set your local timezone for metrics.</p>
                    </div>
                    <Button variant="outline" size="sm" className="font-bold font-mono">IST (UTC+05:30)</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button className="font-bold px-8">Save Changes</Button>
              </div>
            </>
          )}

          {activeTab === 'admin' && isAdminMode && (
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-[17px] font-bold">System Administrators</CardTitle>
                <CardDescription className="text-[13px]">Manage users who have full access to the Admin Panel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {adminError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-[13px] font-medium">
                    {adminError}
                  </div>
                )}

                <form onSubmit={handleAddAdmin} className="flex gap-3">
                  <Input 
                    placeholder="new.admin@datastraw.in" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="max-w-md font-medium"
                    required
                  />
                  <Button type="submit" disabled={isAddingAdmin} className="font-bold">
                    {isAddingAdmin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Admin
                  </Button>
                </form>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/50 p-3 text-[12px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <div className="col-span-8">Email Address</div>
                    <div className="col-span-4 text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-border">
                    {isLoadingAdmins ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : admins.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-[13px] font-medium">
                        No admins found.
                      </div>
                    ) : (
                      admins.map((a) => (
                        <div key={a.id} className="grid grid-cols-12 p-3 items-center hover:bg-muted/10 transition-colors">
                          <div className="col-span-8 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] uppercase">
                              {a.email.substring(0,2)}
                            </div>
                            <span className="font-bold text-[14px]">{a.email}</span>
                            {a.email === email && (
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">You</span>
                            )}
                          </div>
                          <div className="col-span-4 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleRemoveAdmin(a.id, a.email)}
                              disabled={a.email === email}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
