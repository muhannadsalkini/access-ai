"use client";

import { useState } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ApiKeyPublic, CreateApiKeyResponse } from "../services/api-keys";
import {
  createApiKey,
  deleteApiKey as deleteApiKeyService,
} from "../services/api-keys";

interface Props {
  initialKeys: ApiKeyPublic[];
}

export default function ApiKeysManager({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKeyPublic[]>(initialKeys);
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      const result = await createApiKey(keyName || "Default");
      setNewKey(result);
      setShowKey(true);
      setKeys((prev) => [
        {
          id: result.id,
          name: result.name,
          key_prefix: result.key_prefix,
          last_used_at: null,
          created_at: result.created_at,
        },
        ...prev,
      ]);
      setKeyName("");
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) return;
    setDeleting(keyId);
    try {
      await deleteApiKeyService(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      if (newKey?.id === keyId) setNewKey(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete API key");
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Newly created key banner */}
      {newKey && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-300">
                API Key Created — Copy it now!
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                This key will only be shown once. Store it securely.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3 font-mono text-sm">
            <code className="flex-1 text-emerald-300 break-all">
              {showKey ? newKey.key : "•".repeat(48)}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleCopy(newKey.key)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Create new key */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        {!showForm ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => setShowForm(true)}
              disabled={keys.length >= 10}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-violet-600"
            >
              <Plus className="w-4 h-4" />
              Generate New API Key
            </button>
            <span className="text-xs text-zinc-500">
              {keys.length} / 10 keys used
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Key Name (optional)
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Cursor, CI/CD, My Project"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setKeyName("");
                }}
                className="px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keys list */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-zinc-400 text-sm">No API keys yet</p>
            <p className="text-zinc-500 text-xs mt-1">
              Generate a key to use with the MCP server or SDK integrations
            </p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-4 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <span>Name</span>
              <span>Key</span>
              <span>Last Used</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            {keys.map((key) => (
              <div
                key={key.id}
                className="sm:grid sm:grid-cols-4 gap-4 px-5 py-4 border-b border-white/[0.03] last:border-0 items-center"
              >
                {/* Name */}
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{key.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(key.created_at)}
                    </p>
                  </div>
                </div>

                {/* Key prefix */}
                <div className="mb-2 sm:mb-0">
                  <code className="text-xs text-zinc-400 bg-white/[0.04] px-2 py-1 rounded font-mono">
                    {key.key_prefix}...
                  </code>
                </div>

                {/* Last used */}
                <div className="mb-2 sm:mb-0">
                  <span className="text-sm text-zinc-400">
                    {key.last_used_at
                      ? formatDate(key.last_used_at)
                      : "Never"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(key.id)}
                    disabled={deleting === key.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    {deleting === key.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage hint */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Quick Setup</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Add this to your IDE&apos;s MCP configuration (Cursor, Cline, Claude
          Code, etc.):
        </p>
        <pre className="text-xs bg-black/30 rounded-lg p-4 overflow-x-auto text-zinc-300">
          <code>{`{
  "mcpServers": {
    "accessai": {
      "command": "npx",
      "args": ["-y", "accessai-mcp"],
      "env": {
        "ACCESSAI_API_KEY": "your_api_key_here"
      }
    }
  }
}`}</code>
        </pre>
      </div>
    </div>
  );
}
