"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HiCog,
  HiOutlineBookmark,
  HiDotsHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
  HiPlus,
} from "react-icons/hi";
import ChatSettingsModal from "./ChatSettingsModal";

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
  isDark: boolean;
  onToggleTheme: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
}

function formatSessionDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const groupedSessions = new Map<string, ChatSession[]>();

  [...sessions]
    .sort((firstSession, secondSession) => {
      return (
        new Date(secondSession.createdAt).getTime() -
        new Date(firstSession.createdAt).getTime()
      );
    })
    .forEach((session) => {
      const dateLabel = formatSessionDate(session.createdAt);
      const sessionsForDate = groupedSessions.get(dateLabel) ?? [];
      groupedSessions.set(dateLabel, [...sessionsForDate, session]);
    });

  return Array.from(groupedSessions.entries());
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
  isDark,
  onToggleTheme,
  autoScroll,
  onToggleAutoScroll,
}: ChatSidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const sessionGroups = useMemo(() => groupSessionsByDate(sessions), [sessions]);

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
    <div className="flex h-full w-[min(16.25rem,calc(100vw-4.5rem))] shrink-0 flex-col border-r transition-[background-color,border-color] duration-200" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
      <div className="px-4 pb-4 pt-7 transition-colors duration-200">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
              Recents
            </p>
            <p className="mt-1 text-sm transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>
              Conversation history
            </p>
          </div>
          <button
            onClick={onToggle}
            className="flex"
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
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "var(--input-bg)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
          onClick={onNewChat}
          disabled={newChatDisabled}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
        >
          <HiPlus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessionGroups.map(([dateLabel, sessionsForDate]) => (
          <div key={dateLabel} className="pb-3">
            <p
              className="px-2 pb-1 pt-2 text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {dateLabel}
            </p>
            <div className="space-y-1">
              {sessionsForDate.map((session) => {
                const isActive = session.id === activeSessionId;
                const isPinned = pinnedSessionIds.includes(session.id);
                const isMenuOpen = openMenuId === session.id;

                return (
                  <div key={session.id} className="relative group" data-chat-menu-scope>
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="w-full rounded-lg border-l-2 px-3 py-3 pr-9 text-left text-sm transition-[background-color,color,border-color] duration-200"
                      style={{
                        background: isActive ? "var(--hover-bg)" : "transparent",
                        borderColor: isActive ? "var(--accent)" : "transparent",
                        color: "var(--text-primary)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--hover-bg)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <p className="min-w-0 truncate font-medium">
                          {session.title}
                          {isPinned ? (
                            <span className="ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--input-bg)", color: "var(--accent)" }}>
                              PIN
                            </span>
                          ) : null}
                        </p>
                      </div>
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
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-500 transition-colors"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
        ))}
      </div>
      <div className="border-t p-4" style={{ borderColor: "var(--border-color)" }}>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-sm transition-colors"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <HiCog className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
      <ChatSettingsModal
        open={showSettings}
        isDark={isDark}
        autoScroll={autoScroll}
        onToggleTheme={onToggleTheme}
        onToggleAutoScroll={onToggleAutoScroll}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
