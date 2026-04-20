"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import URLInput from "@/features/scan/components/URLInput";
import ScanProgress from "@/features/scan/components/ScanProgress";
import ReportView from "@/features/scan/components/ReportView";
import { streamScan } from "@/features/scan/services/scan";
import type { Issue, Scan, ScanResult } from "@/shared/types";

import {
  Search,
  Sparkles,
  Code,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  CheckCircle,
  Lock,
  LogIn,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Terminal,
  MessageSquare,
  History,
  Globe,
} from "lucide-react";

export default function HomePage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Scan state
  const [scanLoading, setScanLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  // Live progress from the streaming scan endpoint
  const [progressStage, setProgressStage] = useState<
    "scanning" | "analyzing" | "idle"
  >("idle");
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [progressPages, setProgressPages] = useState<
    { scanned: number; total: number } | null
  >(null);
  const [liveIssueCount, setLiveIssueCount] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleScan = async (url: string) => {
    setScanLoading(true);
    setResult(null);
    setError("");
    setProgressStage("scanning");
    setProgressMessage("Preparing scan…");
    setProgressPages(null);
    setLiveIssueCount(0);

    // Accumulate results in local variables while streaming.
    // setResult is called ONCE after the stream fully completes so that React
    // always batches it with setScanLoading(false) — preventing any flash of
    // "No accessibility issues detected!" with an empty list.
    let partialScan: Scan | null = null;
    let finalScan: Scan | null = null;
    const partialIssues: Issue[] = [];
    let partialSummary = "";
    let partialPriority = "";

    const buildResult = (): ScanResult | null => {
      const scan = finalScan ?? partialScan;
      if (!scan) return null;
      const report =
        partialSummary || partialPriority
          ? {
              id: `partial-${scan.id}`,
              scan_id: scan.id,
              summary: partialSummary,
              priority_recommendations: partialPriority,
            }
          : null;
      return { scan, issues: [...partialIssues], report };
    };

    try {
      await streamScan(url, {
        onEvent: (evt) => {
          switch (evt.type) {
            case "scan":
              partialScan = evt.scan;
              break;
            case "status":
              if (evt.status === "scanning" || evt.status === "analyzing") {
                setProgressStage(evt.status);
              }
              break;
            case "progress":
              setProgressMessage(evt.message);
              if (
                typeof evt.pagesScanned === "number" &&
                typeof evt.pagesTotal === "number"
              ) {
                setProgressPages({
                  scanned: evt.pagesScanned,
                  total: evt.pagesTotal,
                });
              }
              break;
            case "violations_found":
              if (partialScan) {
                partialScan = {
                  ...partialScan,
                  accessibility_score: evt.score,
                };
              }
              break;
            case "summary":
              partialSummary = evt.summary;
              partialPriority = evt.priority_recommendations;
              break;
            case "issue":
              partialIssues.push(evt.issue);
              setLiveIssueCount(partialIssues.length);
              break;
            case "done":
              // Record the final scan object — do NOT call setResult yet.
              // We call it once, synchronously, right before setScanLoading(false)
              // so React batches both into a single render (no empty-list flash).
              finalScan = evt.scan;
              break;
            case "error":
              throw new Error(evt.message);
          }
        },
      });

      // Stream fully drained — set the result with everything accumulated.
      // This runs synchronously before the finally block so React can batch
      // setResult + setScanLoading(false) into one render.
      setResult(buildResult());
    } catch (err: any) {
      setError(err?.message || "Scan failed. Please try again.");
      setResult(null);
    } finally {
      setScanLoading(false);
      setProgressStage("idle");
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
    setProgressStage("idle");
    setProgressMessage("");
    setProgressPages(null);
    setLiveIssueCount(0);
  };

  // Only show results once scanning is fully complete (avoids flash of
  // "No accessibility issues detected!" while issues are still streaming).
  if (result && !scanLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Scan another website
          </button>
        </div>
        <ReportView result={result} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section with Scanner */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-zinc-300">
              AI-Powered WCAG 2.1 Analysis
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
            <span className="text-white">Make the web</span>
            <br />
            <span className="gradient-text">accessible for everyone</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 animate-fade-in leading-relaxed">
            Instantly identify, understand, and fix accessibility barriers with
            automated WCAG scanning and AI-powered expert recommendations.
          </p>

          {/* Auth-aware Scanner Area */}
          {!authLoading && (
            <div className="animate-fade-in">
              {user ? (
                /* Logged-in: Show scanner */
                <div className="max-w-2xl mx-auto">
                  {!scanLoading && !error && (
                    <URLInput onSubmit={handleScan} loading={scanLoading} />
                  )}

                  {scanLoading && (
                    <ScanProgress
                      stage={progressStage}
                      message={progressMessage}
                      pages={progressPages}
                      issueCount={liveIssueCount}
                    />
                  )}

                  {error && (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
                        <AlertCircle className="w-7 h-7 text-red-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">
                        Scan Failed
                      </h2>
                      <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                        {error}
                      </p>
                      <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 font-medium transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Not logged-in: Show login prompt */
                <div className="max-w-md mx-auto">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-sm">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                      <Lock className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Sign in to start scanning
                    </h3>
                    <p className="text-sm text-zinc-400 mb-6">
                      Log in to your account to scan websites for accessibility
                      issues and get AI-powered recommendations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link
                        href="/login"
                        className="group inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-medium text-sm transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400 hover:to-violet-500"
                      >
                        <LogIn className="w-4 h-4" />
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-zinc-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "WCAG 2.1", label: "Full Compliance", icon: Shield },
              {
                value: "AI-Powered",
                label: "Issue Analysis",
                icon: Sparkles,
              },
              { value: "Real-time", label: "Scan Results", icon: Zap },
              {
                value: "Detailed",
                label: "Fix Suggestions",
                icon: BarChart3,
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 mb-3 group-hover:border-indigo-500/30 transition-colors">
                  <stat.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p className="text-sm text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Three simple steps to a fully accessible website
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className="absolute top-8 right-8 text-5xl font-bold text-white/[0.03] select-none">
                01
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Scan</h3>
              <p className="text-zinc-400 leading-relaxed">
                Enter any website URL. Our engine loads the page in a real
                browser and runs comprehensive WCAG 2.1 accessibility checks.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className="absolute top-8 right-8 text-5xl font-bold text-white/[0.03] select-none">
                02
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Analyze
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                Our AI agent classifies each issue by severity, explains its
                impact on users with disabilities, and references WCAG criteria.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className="absolute top-8 right-8 text-5xl font-bold text-white/[0.03] select-none">
                03
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                <Code className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Fix</h3>
              <p className="text-zinc-400 leading-relaxed">
                Get specific, actionable code-level fix suggestions for every
                issue — ready to copy and implement immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* IDE Integration / MCP Server Section */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Text content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-6">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">
                  MCP Server
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Scan directly from{" "}
                <span className="gradient-text">your IDE</span>
              </h2>

              <p className="text-zinc-400 mb-8 leading-relaxed">
                Use the AccessAI MCP server with Cursor, Cline, Claude Code,
                Windsurf, or any MCP-compatible AI agent. Scan websites, get
                reports, and ask follow-up questions — all without leaving your
                editor.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  {
                    icon: Globe,
                    title: "Scan any URL",
                    desc: "Run WCAG accessibility scans from a simple prompt",
                  },
                  {
                    icon: History,
                    title: "View scan history",
                    desc: "Access all your past scans and reports in context",
                  },
                  {
                    icon: MessageSquare,
                    title: "Chat about issues",
                    desc: "Ask the AI follow-up questions about how to fix issues",
                  },
                  {
                    icon: Code,
                    title: "Works with any AI SDK",
                    desc: "Vercel AI SDK, OpenAI Agents, Google ADK, LangChain",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://github.com/muhannadsalkini/access-ai/tree/main/mcp-server"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View setup guide
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* Right — Code snippet */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 rounded-3xl blur-xl pointer-events-none" />
              <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d1117] overflow-hidden shadow-2xl">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-zinc-500 ml-2 font-mono">
                    mcp.json
                  </span>
                </div>

                {/* Code content */}
                <pre className="p-5 text-sm leading-relaxed overflow-x-auto">
                  <code>
                    <span className="text-zinc-500">
                      {"// Add to your IDE's MCP config\n"}
                    </span>
                    <span className="text-zinc-300">{"{\n"}</span>
                    <span className="text-zinc-300">{"  "}</span>
                    <span className="text-indigo-300">{'"mcpServers"'}</span>
                    <span className="text-zinc-300">{": {\n"}</span>
                    <span className="text-zinc-300">{"    "}</span>
                    <span className="text-indigo-300">{'"accessai"'}</span>
                    <span className="text-zinc-300">{": {\n"}</span>
                    <span className="text-zinc-300">{"      "}</span>
                    <span className="text-emerald-300">{'"command"'}</span>
                    <span className="text-zinc-300">{": "}</span>
                    <span className="text-amber-300">{'"npx"'}</span>
                    <span className="text-zinc-300">{",\n"}</span>
                    <span className="text-zinc-300">{"      "}</span>
                    <span className="text-emerald-300">{'"args"'}</span>
                    <span className="text-zinc-300">{": ["}</span>
                    <span className="text-amber-300">{'"-y"'}</span>
                    <span className="text-zinc-300">{", "}</span>
                    <span className="text-amber-300">{'"accessai-mcp"'}</span>
                    <span className="text-zinc-300">{"],\n"}</span>
                    <span className="text-zinc-300">{"      "}</span>
                    <span className="text-emerald-300">{'"env"'}</span>
                    <span className="text-zinc-300">{": {\n"}</span>
                    <span className="text-zinc-300">{"        "}</span>
                    <span className="text-emerald-300">
                      {'"ACCESSAI_API_KEY"'}
                    </span>
                    <span className="text-zinc-300">{": "}</span>
                    <span className="text-amber-300">{'"ak_live_..."'}</span>
                    <span className="text-zinc-300">{"\n"}</span>
                    <span className="text-zinc-300">{"      }\n"}</span>
                    <span className="text-zinc-300">{"    }\n"}</span>
                    <span className="text-zinc-300">{"  }\n"}</span>
                    <span className="text-zinc-300">{"}"}</span>
                  </code>
                </pre>
              </div>

              {/* IDE badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  "Cursor",
                  "Cline",
                  "Claude Code",
                  "Windsurf",
                  "Vercel AI SDK",
                  "OpenAI SDK",
                ].map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-white/[0.08] bg-white/[0.03] text-zinc-400"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section — only for non-logged-in users */}
      {!authLoading && !user && (
        <section className="py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.04] p-12 text-center overflow-hidden">
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative">
                <CheckCircle className="w-10 h-10 text-indigo-400 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">
                  Ready to improve your site&apos;s accessibility?
                </h2>
                <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                  Over 96% of websites have accessibility issues. Let AccessAI
                  help you find and fix them with AI-powered analysis.
                </p>
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400 hover:to-violet-500"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">
            Built with accessibility in mind.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <a
              href="https://github.com/muhannadsalkini/access-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
