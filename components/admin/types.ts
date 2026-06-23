export type UserRole = "Admin" | "HR" | "Engineer" | "Finance" | "Legal" | "Designer" | "User";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  startedAt: string;
  messageCount: number;
  messages: ChatMessage[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  lastActive: string;
  totalSessions: number;
  totalMessages: number;
  sessions: ChatSession[];
}

export interface UsagePoint {
  label: string;
  chats: number;
  users: number;
}
