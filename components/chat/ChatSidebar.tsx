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
  onToggle: () => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onToggle,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-[24px] border transition-[background-color,border-color] duration-200" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
      <div className="border-b p-4 transition-colors duration-200" style={{ borderColor: 'var(--border-color)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>
            Conversations
          </p>
          <button
            onClick={onToggle}
            className="md:flex hidden" /* Hidden on mobile to avoid double-toggle since mobile handles it via backdrop */
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </svg>
          </button>
        </div>
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
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className="w-full rounded-2xl px-4 py-3 text-left text-sm transition-[background-color,color] duration-200"
            style={{ 
              background: isActive ? 'var(--hover-bg)' : 'transparent',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <p className="truncate font-medium">{session.title}</p>
            <p className="mt-1 text-xs transition-colors duration-200" style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {formatDistanceToNow(new Date(session.createdAt))}
            </p>
          </button>
          );
        })}
      </div>
    </div>
  );
}
