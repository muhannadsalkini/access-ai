import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createScan } from "@/lib/api";
import type { ScanResult } from "@/types";
import LoginScreen from "./screens/LoginScreen";
import ScanScreen from "./screens/ScanScreen";
import ProgressScreen from "./screens/ProgressScreen";
import ReportScreen from "./screens/ReportScreen";

// ── View state ────────────────────────────────────────────────────────────────

type ViewState =
  | { screen: "loading" }
  | { screen: "login" }
  | { screen: "scan"; error?: string }
  | { screen: "progress"; url: string }
  | { screen: "report"; result: ScanResult };

// ── Root component ────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<ViewState>({ screen: "loading" });
  const [session, setSession] = useState<Session | null>(null);

  // ── Auth init ────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setView(data.session ? { screen: "scan" } : { screen: "login" });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setView({ screen: "login" });
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleStartScan = async (url: string) => {
    setView({ screen: "progress", url });

    try {
      const result = await createScan(url);
      setView({ screen: "report", result });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Scan failed. Please try again.";
      setView({ screen: "scan", error: message });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (view.screen === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#09090b]">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (view.screen === "login") {
    return (
      <LoginScreen onLogin={() => setView({ screen: "scan" })} />
    );
  }

  if (view.screen === "scan") {
    return (
      <ScanScreen
        userEmail={session?.user.email ?? ""}
        onStartScan={handleStartScan}
        onSignOut={handleSignOut}
        error={view.error}
      />
    );
  }

  if (view.screen === "progress") {
    return <ProgressScreen url={view.url} />;
  }

  if (view.screen === "report") {
    return (
      <ReportScreen
        result={view.result}
        onScanAnother={() => setView({ screen: "scan" })}
        onSignOut={handleSignOut}
      />
    );
  }

  return null;
}
