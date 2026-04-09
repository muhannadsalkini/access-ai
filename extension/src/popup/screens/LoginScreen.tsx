import { useState } from "react";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import Logo from "../components/Logo";
import { supabase } from "@/lib/supabase";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL as string;

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onLogin();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <Logo size={28} />
        <span className="text-sm font-semibold text-white">AccessAI</span>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="text-center mb-7">
          <h1 className="text-xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-xs text-zinc-400">
            Sign in to your AccessAI account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 text-red-400 p-3 rounded-xl text-xs border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-2 text-center">
          <a
            href={`${FRONTEND_URL}/signup`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            No account? Create one on AccessAI
          </a>
          <a
            href={`${FRONTEND_URL}/forgot-password`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
