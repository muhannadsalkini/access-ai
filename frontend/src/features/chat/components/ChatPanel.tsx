"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/shared/types";
import {
  getChatMessages,
  streamChatMessage,
  clearChatMessages,
} from "@/features/chat/services/chat";
import MarkdownRenderer from "@/shared/components/MarkdownRenderer";
import { cn } from "@/shared/lib/utils";
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
} from "lucide-react";

interface ChatPanelProps {
  scanId: string;
}

export default function ChatPanel({ scanId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);
  // Streaming state: the content being built up chunk by chunk
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const existing = await getChatMessages(scanId);
        setMessages(existing);
        if (existing.length > 0) {
          setExpanded(true);
        }
      } catch {
        // Silently fail — chat is optional
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [scanId]);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, expanded]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setError("");
    setSending(true);
    setInput("");
    setStreamingContent("");

    // Optimistically add user message
    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      scan_id: scanId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      await streamChatMessage(scanId, trimmed, {
        onUserMessage: (savedUserMsg) => {
          // Replace optimistic user message with the real saved one
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticUserMsg.id ? savedUserMsg : m))
          );
        },
        onChunk: (text) => {
          // Append chunk to streaming content
          setStreamingContent((prev) => prev + text);
        },
        onDone: (savedAssistantMsg) => {
          // Replace streaming bubble with the final saved message
          setStreamingContent("");
          if (savedAssistantMsg) {
            setMessages((prev) => [...prev, savedAssistantMsg]);
          }
          setSending(false);
          inputRef.current?.focus();
        },
        onError: (errMsg) => {
          setError(errMsg);
          setStreamingContent("");
          setSending(false);
        },
      });

      // If stream ended without a "saved" event (edge case), still clean up
      setSending(false);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      // Remove optimistic user message on error
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticUserMsg.id)
      );
      setStreamingContent("");
      setInput(trimmed); // Restore input
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, scanId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <div className="flex items-center justify-between px-6 py-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          className="flex items-center gap-3 flex-1 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              Chat with AI Assistant
            </h3>
            <p className="text-xs text-zinc-500">
              Ask questions about the issues and get fix suggestions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && expanded && (
            <button
              onClick={async () => {
                if (sending || clearing) return;
                setClearing(true);
                try {
                  await clearChatMessages(scanId);
                  setMessages([]);
                  setStreamingContent("");
                  setError("");
                } catch {
                  setError("Failed to clear messages");
                } finally {
                  setClearing(false);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                clearing
                  ? "text-red-400 bg-red-500/10 cursor-not-allowed"
                  : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              )}
              aria-label="Clear chat"
              disabled={sending || clearing}
            >
              {clearing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              {clearing ? "Clearing..." : "Clear"}
            </button>
          )}
          {messages.length > 0 && (
            <span className="text-xs text-zinc-500">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(!expanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded(!expanded);
              }
            }}
            className="p-1 rounded-md hover:bg-white/[0.04] cursor-pointer transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </div>
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-white/[0.06]">
          {/* Messages area */}
          <div className="max-h-96 overflow-y-auto px-6 py-4 space-y-4">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            )}

            {!loading && messages.length === 0 && !sending && (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">
                  Ask anything about this scan&apos;s results.
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  e.g. &quot;How do I fix the color contrast issue?&quot;
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-indigo-500/20 text-indigo-100 border border-indigo-500/20"
                      : "bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-700/50 border border-zinc-600/30 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming assistant bubble — shows content as it arrives */}
            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="max-w-[80%] bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-zinc-300">
                  {streamingContent ? (
                    <MarkdownRenderer content={streamingContent} />
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/[0.06] px-6 py-4">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the scan results..."
                rows={1}
                maxLength={2000}
                disabled={sending}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  input.trim() && !sending
                    ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-white/[0.04] text-zinc-600 cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
