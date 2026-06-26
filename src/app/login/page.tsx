"use client";

import { useState, useEffect } from "react";
import { Terminal, Mail, Lock, ShieldCheck, User, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { checkUserRole } from "@/services/adminService";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleMode, setRoleMode] = useState<"admin" | "agent">("agent");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setErrorMsg(err);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Email domain check
    if (!cleanEmail.endsWith("@datastraw.in")) {
      setErrorMsg("Unauthorized: Only @datastraw.in emails are permitted.");
      setIsLoading(false);
      return;
    }

    try {
      // 2. Attempt Supabase Auth login
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      // 3. Auto-Provisioning Fallback for Authorized Users
      if (authError && authError.message.includes("Invalid login credentials")) {
        const actualRole = await checkUserRole(cleanEmail);
        
        if (actualRole) {
          // They are authorized but don't have this password set. Auto-sign up!
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
          });

          if (!signUpError && signUpData.user) {
            authError = null; // Cleared!
            authData = signUpData;
          } else if (signUpError && signUpError.message.toLowerCase().includes("already registered")) {
             setErrorMsg("This account was created with Google OAuth. Please click 'Login with Google'.");
             setIsLoading(false);
             return;
          } else {
            setErrorMsg(signUpError?.message || authError.message);
            setIsLoading(false);
            return;
          }
        } else {
          setErrorMsg("Access Denied: You are not authorized by an Admin.");
          setIsLoading(false);
          return;
        }
      } else if (authError) {
        setErrorMsg(authError.message);
        setIsLoading(false);
        return;
      }

      // 4. Query role from public database schema (Final verification)
      const actualRole = await checkUserRole(cleanEmail);

      if (!actualRole) {
        setErrorMsg("Access Denied: You are not registered as an agent or admin.");
        setIsLoading(false);
        return;
      }

      if (roleMode === "admin" && actualRole !== "admin") {
        setErrorMsg("Access Denied: You do not have Admin privileges.");
        setIsLoading(false);
        return;
      }

      // Store session credentials
      localStorage.setItem("session_email", cleanEmail);
      localStorage.setItem("session_role", actualRole);

      // Redirect based on role
      if (actualRole === "admin") {
        router.push("/admin");
      } else {
        router.push("/agent/recovery");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login Action
  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "login", // Force Google to prompt for password every time
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Google Sign-In.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-4 bg-background">
      <main className="w-full max-w-[440px] space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center w-12 h-12 bg-primary rounded-xl shadow-md shadow-primary/20">
            <Terminal className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Datastraw CRM Console
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium">
            Recovery Terminal | operator@datastraw.in
          </p>
        </div>

        {/* Mode Selector Tab */}
        <div className="grid grid-cols-2 p-1 bg-muted rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setRoleMode("agent");
              setErrorMsg(null);
            }}
            className={`py-2 text-[13px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === "agent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            Agent Console
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleMode("admin");
              setErrorMsg(null);
            }}
            className={`py-2 text-[13px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleMode === "admin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Panel
          </button>
        </div>

        {/* Card */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-4">
            <h2 className="text-[17px] font-bold text-foreground">
              {roleMode === "admin" ? "Admin Security Portal" : "Agent Recovery Login"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              Enter your datastraw.in credentials or use Google OAuth.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex gap-2 text-[12px] font-medium leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 text-destructive mt-[2px]" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-bold text-foreground">
                  Organization Email
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@datastraw.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 font-medium transition-all group-focus-within:ring-2 group-focus-within:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-bold text-foreground">
                  Credentials Password
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 font-medium transition-all group-focus-within:ring-2 group-focus-within:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full font-bold h-10 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  {isLoading ? "Authenticating..." : `Login as ${roleMode === "admin" ? "Admin" : "Agent"}`}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full font-bold h-10 border-border bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.25C17.65 1.58 15 0 12 0 7.37 0 3.39 2.67 1.45 6.57l3.92 3.04C6.31 6.84 9 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.48c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.65-5.02 3.65-8.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.37 14.1c-.24-.72-.37-1.49-.37-2.28s.13-1.56.37-2.28L1.45 6.5C.52 8.36 0 10.43 0 12.5s.52 4.14 1.45 6l3.92-3.04C5.1 14.82 5.1 14.48 5.37 14.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.05.7-2.4 1.13-4.2 1.13-3 0-5.69-1.8-6.63-4.57L1.45 17.8C3.39 21.67 7.37 24 12 24z"
                    />
                  </svg>
                  Login with Google
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Info */}
        <p className="text-[12px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Access strictly monitored under corporate data guidelines.
        </p>
      </main>
    </div>
  );
}
