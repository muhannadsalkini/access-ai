"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import ApiKeysManager from "@/features/api-keys/components/ApiKeysManager";
import {
  getApiKeys,
  type ApiKeyPublic,
} from "@/features/api-keys/services/api-keys";
import { Settings, User as UserIcon, Key, Mail, Calendar, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        // ignore
      } finally {
        setLoadingUser(false);
      }

      // Fetch API keys
      try {
        const data = await getApiKeys();
        setKeys(data);
      } catch (err: any) {
        setError(err.message || "Failed to load API keys");
      } finally {
        setLoadingKeys(false);
      }
    };

    fetchData();
  }, [supabase.auth]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-zinc-400 ml-13">
          Manage your profile and API keys
        </p>
      </div>

      {/* ─── Profile Section ─── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>

        {loadingUser ? (
          <ProfileSkeleton />
        ) : user ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-lg shadow-indigo-500/20 shrink-0">
                {user.email ? user.email.charAt(0) : "U"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </div>
                  <p className="text-white font-medium truncate">{user.email}</p>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Member Since
                    </div>
                    <p className="text-zinc-300 text-sm">
                      {user.created_at ? formatDate(user.created_at) : "—"}
                    </p>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-500 mb-0.5">Auth Provider</div>
                    <p className="text-zinc-300 text-sm capitalize">
                      {user.app_metadata?.provider || "email"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span>Unable to load profile information.</span>
          </div>
        )}
      </section>

      {/* ─── API Keys Section ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
        </div>

        <p className="text-sm text-zinc-400 mb-5">
          Use API keys to authenticate with the AccessAI MCP server and SDK
          integrations. Keys are hashed and can be revoked at any time.
        </p>

        {loadingKeys ? (
          <ApiKeysSkeleton />
        ) : error ? (
          <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <ApiKeysManager initialKeys={keys} />
        )}
      </section>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.06]" />
        <div className="flex-1 space-y-4">
          <div>
            <div className="h-3 w-10 bg-white/[0.06] rounded mb-2" />
            <div className="h-4 w-48 bg-white/[0.06] rounded" />
          </div>
          <div className="flex gap-6">
            <div>
              <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
              <div className="h-3 w-28 bg-white/[0.06] rounded" />
            </div>
            <div>
              <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
              <div className="h-3 w-16 bg-white/[0.06] rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeysSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
        <div className="h-10 w-48 bg-white/[0.06] rounded-lg" />
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-pulse">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="sm:grid sm:grid-cols-4 gap-4 px-5 py-4 border-b border-white/[0.03] last:border-0 items-center"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/[0.06] rounded-lg" />
              <div className="h-3 w-20 bg-white/[0.06] rounded" />
            </div>
            <div className="h-5 w-24 bg-white/[0.06] rounded" />
            <div className="h-3 w-16 bg-white/[0.06] rounded" />
            <div className="flex justify-end">
              <div className="h-6 w-16 bg-white/[0.06] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
