import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Bell, Shield, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 pb-12 h-full max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h1>
        <p className="text-[15px] font-medium text-muted-foreground mt-1">Manage your terminal preferences and account settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-4">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 space-y-1">
          <Button variant="ghost" className="w-full justify-start font-bold bg-muted/50">
            <User className="mr-2 w-4 h-4" />
            Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start font-bold text-muted-foreground">
            <Bell className="mr-2 w-4 h-4" />
            Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start font-bold text-muted-foreground">
            <Shield className="mr-2 w-4 h-4" />
            Security
          </Button>
          <Button variant="ghost" className="w-full justify-start font-bold text-muted-foreground">
            <Key className="mr-2 w-4 h-4" />
            API Keys
          </Button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-[17px] font-bold">Public Profile</CardTitle>
              <CardDescription className="text-[13px]">This is how others will see you on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px] font-bold">Display Name</Label>
                <Input id="name" defaultValue="Sarah Jenkins" className="max-w-md font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-bold">Email Address</Label>
                <Input id="email" defaultValue="sarah.j@enterprise.com" readOnly className="max-w-md bg-muted/50 text-muted-foreground font-medium" />
                <p className="text-[11px] text-muted-foreground mt-1">Contact your administrator to change your email address.</p>
              </div>
              <div className="space-y-2 pt-2">
                <Label className="text-[13px] font-bold">Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary">
                    SJ
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
        </div>
      </div>
    </div>
  );
}
