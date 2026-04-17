import { supabaseAdmin as supabase } from "../../services/supabase/client";
import { callAgentChat } from "../../services/agent/agent-client";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import type { ChatMessage, SendChatResponse } from "./chat.types";
import type { Response } from "express";

/** Build auth headers for direct fetch calls to the agent service. */
function agentHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.agentInternalSecret) {
    headers["X-Internal-Secret"] = env.agentInternalSecret;
  }
  return headers;
}

/**
 * Verify that a scan exists and is owned by the given user.
 * Throws a 404-style error if not found or not owned.
 */
async function assertScanOwnership(scanId: string, userId: string): Promise<void> {
  const { data: scan, error } = await supabase
    .from("scans")
    .select("id")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (error || !scan) {
    throw Object.assign(new Error("Scan not found"), { statusCode: 404 });
  }
}

/**
 * Get all chat messages for a scan.
 * Verifies that the requesting user owns the scan before returning data.
 */
export async function getChatMessages(scanId: string, userId: string): Promise<ChatMessage[]> {
  await assertScanOwnership(scanId, userId);

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Failed to fetch chat messages:", error);
    throw new Error("Failed to fetch chat messages");
  }

  return data || [];
}

/**
 * Delete all chat messages for a scan.
 * Verifies that the requesting user owns the scan before deleting.
 */
export async function clearChatMessages(scanId: string, userId: string): Promise<void> {
  await assertScanOwnership(scanId, userId);

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("scan_id", scanId);

  if (error) {
    logger.error("Failed to clear chat messages:", error);
    throw new Error("Failed to clear chat messages");
  }
}

/**
 * Send a chat message and get a response from the AI agent.
 * Verifies that the requesting user owns the scan before proceeding.
 */
export async function sendChatMessage(
  scanId: string,
  userMessage: string,
  userId: string
): Promise<SendChatResponse> {
  // 1. Fetch scan data for context — ownership verified via user_id filter
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (scanError || !scan) {
    throw Object.assign(new Error("Scan not found"), { statusCode: 404 });
  }

  // 2. Fetch issues for context
  const { data: issues } = await supabase
    .from("issues")
    .select("issue_type, severity, description, recommendation, wcag_reference")
    .eq("scan_id", scanId);

  // 3. Fetch report for context
  const { data: report } = await supabase
    .from("reports")
    .select("summary, priority_recommendations")
    .eq("scan_id", scanId)
    .single();

  // 4. Fetch existing conversation history (ownership already verified above)
  const existingMessages = await getChatMessages(scanId, userId);

  // 5. Save user message
  const { data: savedUserMsg, error: userMsgError } = await supabase
    .from("chat_messages")
    .insert({
      scan_id: scanId,
      role: "user",
      content: userMessage,
    })
    .select()
    .single();

  if (userMsgError || !savedUserMsg) {
    logger.error("Failed to save user message:", userMsgError);
    throw new Error("Failed to save message");
  }

  // 6. Build issues text for context
  const issuesText = (issues || [])
    .map(
      (i: any, idx: number) =>
        `${idx + 1}. [${i.severity.toUpperCase()}] ${i.issue_type}: ${i.description}`
    )
    .join("\n");

  // 7. Build conversation history
  const conversationHistory = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 8. Call the AI agent
  const agentResponse = await callAgentChat({
    url: scan.url,
    score: scan.accessibility_score || 0,
    summary: report?.summary || "No summary available.",
    issuesText: issuesText || "No issues found.",
    message: userMessage,
    conversationHistory,
  });

  // 9. Save assistant response
  const { data: savedAssistantMsg, error: assistantMsgError } = await supabase
    .from("chat_messages")
    .insert({
      scan_id: scanId,
      role: "assistant",
      content: agentResponse.response,
    })
    .select()
    .single();

  if (assistantMsgError || !savedAssistantMsg) {
    logger.error("Failed to save assistant message:", assistantMsgError);
    throw new Error("Failed to save response");
  }

  return {
    message: savedUserMsg as ChatMessage,
    response: savedAssistantMsg as ChatMessage,
  };
}

/**
 * Send a chat message and stream the AI response via SSE.
 * Verifies that the requesting user owns the scan before proceeding.
 */
export async function sendChatMessageStream(
  scanId: string,
  userMessage: string,
  res: Response,
  userId: string
): Promise<void> {
  // 1. Fetch scan — ownership verified via user_id filter
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (scanError || !scan) {
    throw Object.assign(new Error("Scan not found"), { statusCode: 404 });
  }

  const { data: issues } = await supabase
    .from("issues")
    .select("issue_type, severity, description, recommendation, wcag_reference")
    .eq("scan_id", scanId);

  const { data: report } = await supabase
    .from("reports")
    .select("summary, priority_recommendations")
    .eq("scan_id", scanId)
    .single();

  // Ownership already verified above
  const existingMessages = await getChatMessages(scanId, userId);

  // 5. Save user message
  const { data: savedUserMsg, error: userMsgError } = await supabase
    .from("chat_messages")
    .insert({ scan_id: scanId, role: "user", content: userMessage })
    .select()
    .single();

  if (userMsgError || !savedUserMsg) {
    logger.error("Failed to save user message:", userMsgError);
    throw new Error("Failed to save message");
  }

  // 6. Build context
  const issuesText = (issues || [])
    .map(
      (i: any, idx: number) =>
        `${idx + 1}. [${i.severity.toUpperCase()}] ${i.issue_type}: ${i.description}`
    )
    .join("\n");

  const conversationHistory = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 7. Send the saved user message as the first SSE event
  res.write(
    `data: ${JSON.stringify({ userMessage: savedUserMsg })}\n\n`
  );

  // 8. Stream from agent
  const agentUrl = `${env.agentServiceUrl}/agent/chat/stream`;

  const agentResponse = await fetch(agentUrl, {
    method: "POST",
    headers: agentHeaders(),
    body: JSON.stringify({
      url: scan.url,
      score: scan.accessibility_score || 0,
      summary: report?.summary || "No summary available.",
      issues_text: issuesText || "No issues found.",
      message: userMessage,
      conversation_history: conversationHistory,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!agentResponse.ok || !agentResponse.body) {
    throw new Error(`Agent stream returned ${agentResponse.status}`);
  }

  // 9. Pipe agent SSE chunks to client, collecting full text
  let fullText = "";
  const reader = agentResponse.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Forward SSE lines to client
      res.write(chunk);

      // Parse to collect full text
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) {
              fullText += parsed.text;
            }
            if (parsed.done && parsed.full_text) {
              fullText = parsed.full_text;
            }
          } catch {
            // ignore parse errors on partial lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 10. Save complete assistant response to DB
  if (fullText) {
    const { data: savedAssistantMsg, error: assistantMsgError } = await supabase
      .from("chat_messages")
      .insert({ scan_id: scanId, role: "assistant", content: fullText })
      .select()
      .single();

    if (assistantMsgError) {
      logger.error("Failed to save streamed assistant message:", assistantMsgError);
    } else {
      // Send final event with saved message ID
      res.write(
        `data: ${JSON.stringify({ saved: savedAssistantMsg })}\n\n`
      );
    }
  }

  res.end();
}
