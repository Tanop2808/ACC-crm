"use client";

import { useState, useEffect } from "react";
import { Terminal, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
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
      <main className="w-full max-w-[400px] space-y-6">
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

        {/* Card */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-4 text-center">
            <h2 className="text-[17px] font-bold text-foreground">
              Secure System Access
            </h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              Authentication is restricted to authorized @datastraw.in accounts.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex gap-2 text-[12px] font-medium leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 text-destructive mt-[2px]" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="w-full h-11 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold transition-all shadow-sm"
            >
              {isLoading ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Login with Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-primary/80" />
          Access strictly monitored under corporate data guidelines.
        </div>
      </main>
    </div>
  );
}
