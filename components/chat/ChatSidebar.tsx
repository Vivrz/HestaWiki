"use client";

import { Button } from "flowbite-react";
import { HiPlus } from "react-icons/hi";
import { formatDistanceToNow } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-white/60 bg-[#1d428a] backdrop-blur-xl">
      <div className="border-b border-slate-200/80 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Conversations
        </p>
        <Button
          className="w-full border-none bg-[#e56043]"
          onClick={onNewChat}
        >
          <span className="flex items-center justify-center gap-2">
            <HiPlus className="h-4 w-4" />
            <span>New Chat</span>
          </span>
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
              session.id === activeSessionId
                ? "bg-sky-100 text-sky-950 ring-1 ring-sky-200 shadow-[0_20px_50px_-30px_rgba(14,165,233,0.45)]"
                : "text-white hover:bg-sky-50/80 hover:text-slate-900"
            }`}
          >
            <p className="truncate font-medium">{session.title}</p>
            <p className={`mt-1 text-xs ${session.id === activeSessionId ? "text-sky-700" : "text-slate-400"}`}>
              {formatDistanceToNow(new Date(session.createdAt))}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
