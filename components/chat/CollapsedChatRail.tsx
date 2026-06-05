"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineChatAlt2, HiOutlinePencil, HiOutlineViewBoards } from "react-icons/hi";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

export default function CollapsedChatRail({
  sessions,
  activeSessionId,
  onOpenSidebar,
  onNewChat,
  newChatDisabled = false,
  onSelectSession,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  newChatDisabled?: boolean;
  onSelectSession: (id: string) => void;
}) {
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ open: boolean; label: string; x: number; y: number }>({
    open: false,
    label: "",
    x: 0,
    y: 0,
  });
  const [recentsPos, setRecentsPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!recentsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRecentsOpen(false);
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (scopeRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setRecentsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [recentsOpen]);

  const recentSessions = useMemo(() => sessions.slice(0, 12), [sessions]);

  const iconButtonClass =
    "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors";

  const showTooltip = (event: React.MouseEvent, label: string) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      open: true,
      label,
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  const hideTooltip = () => {
    setTooltip((prev) => (prev.open ? { ...prev, open: false } : prev));
  };

  const openRecentsAt = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setRecentsPos({ x: rect.right + 10, y: rect.top });
    setRecentsOpen(true);
  };

  useEffect(() => {
    if (!recentsOpen) return;
    const clamp = () => {
      const el = popoverRef.current;
      if (!el) return;
      const pad = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let x = recentsPos.x;
      let y = recentsPos.y;
      if (x + w + pad > vw) x = Math.max(pad, vw - w - pad);
      if (y + h + pad > vh) y = Math.max(pad, vh - h - pad);
      if (x !== recentsPos.x || y !== recentsPos.y) setRecentsPos({ x, y });
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [recentsOpen, recentsPos.x, recentsPos.y]);

  return (
    <div
      ref={scopeRef}
      className="relative flex h-full w-14 shrink-0 flex-col items-center gap-3 border-r px-2 py-5 transition-colors duration-200"
      style={{ background: "var(--header-bg)", borderColor: "var(--border-color)" }}
      aria-label="Collapsed chat sidebar"
    >
      <div className="mb-7 flex h-9 w-9 items-center justify-center rounded-lg" style={{ color: "var(--accent)" }} aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="6" cy="6" r="2" fill="currentColor" />
          <circle cx="18" cy="6" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <circle cx="18" cy="18" r="2" fill="currentColor" />
          <path d="M7.7 7.1 10.3 10M16.3 7.1 13.7 10M7.7 16.9 10.3 14M16.3 16.9 13.7 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>

      <button
        type="button"
        onClick={() => {
          setRecentsOpen(false);
          hideTooltip();
          onOpenSidebar();
        }}
        className={cn(iconButtonClass)}
        style={{ color: "var(--text-secondary)" }}
        aria-label="Open sidebar"
        title="Open sidebar"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <HiOutlineViewBoards className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (newChatDisabled) return;
          setRecentsOpen(false);
          hideTooltip();
          onNewChat();
        }}
        className={cn(iconButtonClass)}
        style={{
          color: "var(--text-secondary)",
          cursor: newChatDisabled ? "not-allowed" : "pointer",
          opacity: newChatDisabled ? 0.6 : 1,
        }}
        aria-label="New chat"
        disabled={newChatDisabled}
        onMouseEnter={(e) => {
          if (newChatDisabled) return;
          e.currentTarget.style.background = "var(--hover-bg)";
          showTooltip(e, "New chat");
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          hideTooltip();
        }}
      >
        <HiOutlinePencil className="h-5 w-5" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            hideTooltip();
            if (recentsOpen) {
              setRecentsOpen(false);
              return;
            }
            const el = e.currentTarget as HTMLElement | null;
            if (!el) return;
            openRecentsAt(el);
          }}
          className={cn(iconButtonClass)}
          style={{
            color: recentsOpen ? "white" : "var(--text-secondary)",
            background: recentsOpen ? "var(--accent)" : "transparent",
          }}
          aria-label="Recents"
          aria-expanded={recentsOpen}
          onMouseEnter={(e) => {
            if (!recentsOpen) e.currentTarget.style.background = "var(--hover-bg)";
            showTooltip(e, "Recents");
          }}
          onMouseLeave={(e) => {
            if (!recentsOpen) e.currentTarget.style.background = "transparent";
            hideTooltip();
          }}
        >
          <HiOutlineChatAlt2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1" />

      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold"
        style={{
          borderColor: "var(--border-color)",
          color: "var(--text-secondary)",
          background: "var(--input-bg)",
        }}
        aria-hidden="true"
      >
        H
      </div>

      {typeof document !== "undefined" && tooltip.open
        ? createPortal(
            <div
              className="fixed z-[1000] -translate-y-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-xs shadow-lg"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                background: "var(--header-bg)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
              role="tooltip"
            >
              {tooltip.label}
            </div>,
            document.body,
          )
        : null}

      {typeof document !== "undefined" && recentsOpen
        ? createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[1001] w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border shadow-2xl"
              style={{
                left: recentsPos.x,
                top: recentsPos.y,
                background: "var(--sidebar-bg)",
                borderColor: "var(--border-color)",
              }}
              role="dialog"
              aria-label="Recent chats"
            >
              <div
                className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                Recents
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-2">
                {recentSessions.length === 0 ? (
                  <div className="px-3 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    No chats yet.
                  </div>
                ) : (
                  recentSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        )}
                        style={{
                          color: "var(--text-primary)",
                          background: isActive ? "var(--hover-bg)" : "transparent",
                        }}
                        onClick={() => {
                          onSelectSession(session.id);
                          setRecentsOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = "var(--hover-bg)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span className="min-w-0 truncate">{session.title}</span>
                        {isActive ? (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: "var(--accent)" }}
                            aria-label="Active chat"
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
