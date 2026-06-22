import { Terminal, Mail, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-4">
      <main className="w-full max-w-[420px]">
        {/* Brand Header Section */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-4 flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
            <Terminal className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight mb-1">
            Recovery Terminal
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium">
            CRM Operator Console | IST Terminal 01
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-4">
            <h2 className="text-[17px] font-bold text-foreground">Login</h2>
            <p className="text-[12px] text-muted-foreground">
              Enter your credentials to access the Control Room.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
                  Email Address
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="operator@recovery-term.com"
                    className="pl-10 font-medium transition-all group-focus-within:ring-2 group-focus-within:ring-primary/20"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-bold text-foreground">
                  Password
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 font-medium transition-all group-focus-within:ring-2 group-focus-within:ring-primary/20"
                    required
                  />
                </div>
              </div>

              {/* Utilities Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label
                    htmlFor="remember"
                    className="text-[12px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <Link href="#" className="text-[12px] text-primary hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button type="button" className="w-full font-bold h-10 mt-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                Login to Terminal
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer / Support Info */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-[12px] text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Encrypted Session via RSA-4096
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="#" className="text-[12px] text-muted-foreground hover:text-primary transition-colors">
              Documentation
            </Link>
            <span className="w-1 h-1 bg-border rounded-full" />
            <Link href="#" className="text-[12px] text-muted-foreground hover:text-primary transition-colors">
              System Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
