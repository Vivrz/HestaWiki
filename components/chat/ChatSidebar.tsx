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
    <div className="flex h-full w-72 shrink-0 flex-col rounded-[24px] border border-[#E5E3DC] bg-[#EFEDE8]">
      <div className="border-b border-[#E5E3DC] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#6B6560]">
          Conversations
        </p>
        <Button
          className="w-full rounded-[12px] border-none bg-[#4A4580] text-white hover:bg-[#3A3570]"
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
                ? "bg-[#E8E5DE] text-[#1C1917]"
                : "text-[#1C1917] hover:bg-[#ECEAE4]"
            }`}
          >
            <p className="truncate font-medium">{session.title}</p>
            <p className={`mt-1 text-xs ${session.id === activeSessionId ? "text-[#4A4580]" : "text-[#6B6560]"}`}>
              {formatDistanceToNow(new Date(session.createdAt))}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
