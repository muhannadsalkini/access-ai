export interface ChatMessage {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SendChatRequest {
  message: string;
}

export interface SendChatResponse {
  message: ChatMessage;
  response: ChatMessage;
}
