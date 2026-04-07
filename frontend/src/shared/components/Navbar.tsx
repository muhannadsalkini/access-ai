"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/shared/lib/utils";
import {
  Clock,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Shield,
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
      pathname === href
        ? "text-white bg-white/10"
        : "text-zinc-400 hover:text-white hover:bg-white/5"
    );

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "glass border-white/[0.06] shadow-lg shadow-black/20"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">
              AccessAI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Link href="/history" className={navLinkClass("/history")}>
                  <Clock className="w-4 h-4" />
                  History
                </Link>

                <div className="w-px h-6 bg-white/10 mx-3" />

                <span className="text-xs text-zinc-500 mr-2 max-w-[160px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={navLinkClass("/login")}>
                  <LogIn className="w-4 h-4" />
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-white/[0.06] animate-fade-in">
            <div className="flex flex-col gap-1">
              {user ? (
                <>
                  <Link href="/history" className={navLinkClass("/history")}>
                    <Clock className="w-4 h-4" />
                    History
                  </Link>
                  <div className="h-px bg-white/[0.06] my-2" />
                  <div className="px-3 py-2">
                    <p className="text-xs text-zinc-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={navLinkClass("/login")}>
                    <LogIn className="w-4 h-4" />
                    Log In
                  </Link>
                  <Link href="/signup" className={navLinkClass("/signup")}>
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
