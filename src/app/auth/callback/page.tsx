"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkUserRole } from "@/services/adminService";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing Authentication...");

  useEffect(() => {
    // Listen for the Auth session load
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const email = session.user.email;
        if (email) {
          if (!email.endsWith("@datastraw.in")) {
            await supabase.auth.signOut();
            localStorage.removeItem("session_email");
            localStorage.removeItem("session_role");
            router.push("/login?error=Unauthorized: Domain restriction enabled.");
            return;
          }

          setStatus("Configuring security role...");
          const role = await checkUserRole(email);
          
          if (role) {
            localStorage.setItem("session_email", email);
            localStorage.setItem("session_role", role);
            
            if (role === "admin") {
              router.push("/admin");
            } else {
              router.push("/agent/recovery");
            }
          } else {
            await supabase.auth.signOut();
            localStorage.removeItem("session_email");
            localStorage.removeItem("session_role");
            router.push("/login?error=Access Denied: Email not registered.");
          }
        }
      } else {
        // If no session is active, redirect to login page
        router.push("/login");
      }
    };

    checkSession();

    // Set up auth state change listener to handle async redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
      <p className="font-medium text-[13px]">{status}</p>
    </div>
  );
}
