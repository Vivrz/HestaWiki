"use client";

import { useEffect, useState } from "react";
import { Button } from "flowbite-react";
import {
  HiOutlineBookmark,
  HiDotsHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
  HiPlus,
} from "react-icons/hi";
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
  newChatDisabled?: boolean;
  onToggle: () => void;
  pinnedSessionIds: string[];
  onRenameSession: (id: string, currentTitle: string) => void;
  onTogglePinSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  newChatDisabled = false,
  onToggle,
  pinnedSessionIds,
  onRenameSession,
  onTogglePinSession,
  onDeleteSession,
}: ChatSidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-chat-menu-scope]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-full w-[min(18rem,calc(100vw-2rem))] shrink-0 flex-col rounded-[24px] border transition-[background-color,border-color] duration-200" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
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
          className="w-full rounded-[12px] border-none bg-[#4A4580] text-white hover:bg-[#3A3570] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onNewChat}
          disabled={newChatDisabled}
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
          const isPinned = pinnedSessionIds.includes(session.id);
          const isMenuOpen = openMenuId === session.id;

          return (
            <div key={session.id} className="relative group" data-chat-menu-scope>
              <button
                onClick={() => onSelectSession(session.id)}
                className="w-full rounded-2xl px-4 py-3 pr-10 text-left text-sm transition-[background-color,color] duration-200"
                style={{
                  background: isActive ? "var(--hover-bg)" : "transparent",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <p className="truncate font-medium">
                  {session.title}
                  {isPinned ? (
                    <span className="ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--hover-bg)", color: "var(--accent)" }}>
                      PIN
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs transition-colors duration-200" style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)" }}>
                  {formatDistanceToNow(new Date(session.createdAt))}
                </p>
              </button>

              <button
                type="button"
                className="absolute right-2 top-2 rounded-md p-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                style={{
                  color: "var(--text-secondary)",
                  background: isMenuOpen ? "var(--hover-bg)" : "transparent",
                  opacity: isMenuOpen ? 1 : undefined,
                }}
                aria-label={`Open actions for ${session.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuId((prev) => (prev === session.id ? null : session.id));
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => {
                  if (!isMenuOpen) e.currentTarget.style.background = "transparent";
                }}
              >
                <HiDotsHorizontal className="h-4 w-4" />
              </button>

              {isMenuOpen ? (
                <div
                  className="absolute right-2 top-10 z-20 w-44 overflow-hidden rounded-xl border py-1 shadow-lg"
                  style={{
                    background: "var(--header-bg)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100/60"
                    style={{ color: "var(--text-primary)" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      onRenameSession(session.id, session.title);
                    }}
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100/60"
                    style={{ color: "var(--text-primary)" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      onTogglePinSession(session.id);
                    }}
                  >
                    <HiOutlineBookmark className="h-4 w-4" />
                    Pin chat
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-500 transition-colors hover:bg-rose-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      onDeleteSession(session.id);
                    }}
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
