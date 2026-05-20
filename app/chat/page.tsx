"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, Button, Spinner } from "flowbite-react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import CollapsedChatRail from "@/components/chat/CollapsedChatRail";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import ChatInput from "@/components/chat/ChatInput";
import {
  HiChevronRight,
  HiClipboardList,
  HiLogout,
  HiMenuAlt2,
  HiShieldCheck,
  HiTicket,
  HiUserGroup,
  HiWifi,
} from "react-icons/hi";

interface Source {
  docId: string;
  docName: string;
  department: string;
  version: number;
  chunkIndex: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

const PINNED_CHATS_STORAGE_KEY = "chat:pinned-session-ids";

import { Suspense } from "react";

function useTypewriterText(text: string, speedMs: number, resetKey: string | null) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText("");
    if (!text) return;

    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      if (index >= text.length) window.clearInterval(interval);
    }, speedMs);

    return () => window.clearInterval(interval);
  }, [resetKey, speedMs, text]);

  return displayText;
}

function ChatContent() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [pinnedSessionIds, setPinnedSessionIds] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back,");
  const authRedirectTriggered = useRef(false);
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    sessionId: string | null;
    initialTitle: string;
    value: string;
  }>({ open: false, sessionId: null, initialTitle: "", value: "" });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    sessionId: string | null;
    title: string;
  }>({ open: false, sessionId: null, title: "" });
  const typedGreeting = useTypewriterText(`${greeting} ${firstName}`, 45, activeSessionId);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning,");
    else if (hour < 17) setGreeting("Good afternoon,");
    else setGreeting("Good evening,");
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("chat-dark")) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_CHATS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setPinnedSessionIds(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PINNED_CHATS_STORAGE_KEY, JSON.stringify(pinnedSessionIds));
  }, [pinnedSessionIds]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("chat-dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("chat-dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const handleAuthExpired = useCallback(() => {
    if (authRedirectTriggered.current) return;
    authRedirectTriggered.current = true;
    signOut({ callbackUrl: "/auth/signin" });
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (res.status === 401 || res.status === 403) {
      handleAuthExpired();
      return [] as ChatSession[];
    }
    if (res.ok) {
      const data = (await res.json()) as ChatSession[];
      setSessions(data);
      return data;
    }
    return [] as ChatSession[];
  }, [handleAuthExpired]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
    if (res.status === 401 || res.status === 403) {
      handleAuthExpired();
      setLoadingMessages(false);
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as Message[];
      setMessages(data);
    }
    setLoadingMessages(false);
  }, [handleAuthExpired]);

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    fetchMessages(id);
  };

  const handleNewChat = useCallback(async () => {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    if (res.status === 401 || res.status === 403) {
      handleAuthExpired();
      return;
    }
    if (res.ok) {
      const session = (await res.json()) as ChatSession;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    }
  }, [handleAuthExpired]);

  const handleRenameSession = useCallback(async (id: string, currentTitle: string) => {
    setRenameModal({
      open: true,
      sessionId: id,
      initialTitle: currentTitle,
      value: currentTitle,
    });
  }, [handleAuthExpired]);

  const handleDeleteSession = useCallback(async (id: string) => {
    const current = sessions.find((session) => session.id === id);
    setDeleteModal({
      open: true,
      sessionId: id,
      title: current?.title ?? "this chat",
    });
  }, [sessions]);

  const closeAllModals = useCallback(() => {
    setRenameModal({ open: false, sessionId: null, initialTitle: "", value: "" });
    setDeleteModal({ open: false, sessionId: null, title: "" });
  }, []);

  useEffect(() => {
    if (!renameModal.open && !deleteModal.open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAllModals();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAllModals, deleteModal.open, renameModal.open]);

  const submitRename = async () => {
    const id = renameModal.sessionId;
    if (!id) return;
    const nextTitle = renameModal.value.trim();
    if (!nextTitle || nextTitle === renameModal.initialTitle) {
      closeAllModals();
      return;
    }

    const res = await fetch(`/api/chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });

    if (res.status === 401 || res.status === 403) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === id ? { ...session, title: nextTitle } : session,
      ),
    );
    closeAllModals();
  };

  const submitDelete = async () => {
    const id = deleteModal.sessionId;
    if (!id) return;

    const res = await fetch(`/api/chat/sessions/${id}`, {
      method: "DELETE",
    });

    if (res.status === 401 || res.status === 403) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) return;

    setPinnedSessionIds((prev) => prev.filter((sessionId) => sessionId !== id));
    const updatedSessions = await fetchSessions();

    if (activeSessionId === id) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
        fetchMessages(updatedSessions[0].id);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
    closeAllModals();
  };

  const handleTogglePinSession = useCallback((id: string) => {
    setPinnedSessionIds((prev) =>
      prev.includes(id)
        ? prev.filter((sessionId) => sessionId !== id)
        : [id, ...prev],
    );
  }, []);

  const orderedSessions = [...sessions].sort((a, b) => {
    const aPinned = pinnedSessionIds.includes(a.id);
    const bPinned = pinnedSessionIds.includes(b.id);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initSession = async () => {
      const initialSessions = await fetchSessions();
      
      const isNewLogin = searchParams.get("new") === "true";
      
      if (isNewLogin) {
        // Immediately clean up the URL to prevent refresh loops
        router.replace("/chat");
        // Start a fresh session
        await handleNewChat();
      } else {
        // Resume the most recent session if it exists
        if (initialSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(initialSessions[0].id);
          fetchMessages(initialSessions[0].id);
        }
      }
    };
    initSession();
  }, [fetchSessions, handleNewChat, searchParams, activeSessionId, fetchMessages, router]); 

  type SSEEvent = { token?: string; done?: boolean; sources?: Source[]; error?: string };

  const parseSSELine = (line: string): SSEEvent | null => {
    if (!line.startsWith("data: ")) return null;
    const json = line.slice(6).trim();
    return json ? (JSON.parse(json) as SSEEvent) : null;
  };

  const processChunk = (
    chunk: string,
    accumulated: string,
    sources: Source[],
  ): { accumulated: string; sources: Source[] } => {
    let acc = accumulated;
    let src = sources;
    for (const line of chunk.split("\n")) {
      const event = parseSSELine(line);
      if (!event) continue;
      if (event.error) throw new Error(event.error);
      if (event.token) { acc += event.token; setStreamingContent(acc); }
      if (event.done) src = event.sources ?? [];
    }
    return { accumulated: acc, sources: src };
  };

  const readStream = async (
    body: ReadableStream<Uint8Array>,
  ): Promise<{ content: string; sources: Source[] }> => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let finalSources: Source[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      ({ accumulated, sources: finalSources } = processChunk(
        decoder.decode(value, { stream: true }),
        accumulated,
        finalSources,
      ));
    }

    return { content: accumulated, sources: finalSources };
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    let sessionId = activeSessionId;

    // Auto-create session if none active
    if (!sessionId) {
      setStreaming(true); // Show loading state while creating session
      try {
        const res = await fetch("/api/chat/sessions", { method: "POST" });
        if (res.status === 401 || res.status === 403) {
          handleAuthExpired();
          throw new Error("Session expired");
        }
        if (!res.ok) throw new Error("Failed to create session");
        const newSession = (await res.json()) as ChatSession;
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        sessionId = newSession.id;
      } catch (err) {
        setError("Failed to initialize chat session");
        setStreaming(false);
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setStreaming(true);
    setStreamingContent("");
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });

      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        throw new Error("Session expired");
      }
      if (!res.ok || !res.body) throw new Error("Failed to send message");

      const { content, sources } = await readStream(res.body);

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content, sources, createdAt: new Date().toISOString() },
      ]);

      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const handleSuggestionClick = (value: string) => {
    setInput(value);
    const textarea = document.querySelector("textarea");
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.focus();
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden transition-colors duration-200" style={{ background: 'var(--chat-bg)', color: 'var(--text-primary)' }}>
      {(renameModal.open || deleteModal.open) ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAllModals();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeAllModals();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border px-5 py-4 shadow-2xl"
            style={{ background: "var(--header-bg)", borderColor: "var(--border-color)" }}
          >
            {renameModal.open ? (
              <>
                <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Rename chat</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Enter a short title for this chat.
                </p>
                <input
                  autoFocus
                  value={renameModal.value}
                  onChange={(e) => setRenameModal((prev) => ({ ...prev, value: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename();
                    if (e.key === "Escape") closeAllModals();
                  }}
                  className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAllModals}
                    className="rounded-full px-4 py-2 text-sm"
                    style={{ background: "var(--hover-bg)", color: "var(--text-primary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitRename}
                    className="rounded-full px-4 py-2 text-sm font-medium text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Delete chat?</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  This will delete <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{deleteModal.title}</span>.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAllModals}
                    className="rounded-full px-4 py-2 text-sm"
                    style={{ background: "var(--hover-bg)", color: "var(--text-primary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitDelete}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
      <header className="border-b px-3 py-4 transition-colors duration-200 sm:px-6" style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setShowSidebar((s) => !s)}
              className="rounded-xl p-2 text-[#6B6560] hover:bg-[#ECEAE4] md:hidden"
            >
              <HiMenuAlt2 className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6B6560]">
                Chat workspace
              </p>
              <h1 className="truncate text-lg font-semibold text-[#6B6560]">
                Enterprise Chatbot
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                marginRight: '8px',
              }}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41 M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            {session?.user.role === "admin" && (
              <Button
                color="gray"
                size="md"
                href="/admin"
                className="rounded-xl border transition-colors"
                style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <span className="inline-flex items-center gap-2">
                  <HiShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </span>
              </Button>
            )}
            <Button
              color="gray"
              size="md"
              className="rounded-xl border transition-colors"
              style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              <span className="inline-flex items-center gap-2">
                <HiLogout className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 justify-center gap-4 overflow-hidden px-4 py-4 sm:px-6">
        {/* Desktop sidebar / collapsed rail */}
        <div
          className="relative hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:block"
          style={{ width: showSidebar ? "288px" : "64px" }}
          aria-label="Chat sidebar region"
        >
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${showSidebar ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <ChatSidebar
              sessions={orderedSessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              onToggle={() => setShowSidebar(false)}
              pinnedSessionIds={pinnedSessionIds}
              onRenameSession={handleRenameSession}
              onTogglePinSession={handleTogglePinSession}
              onDeleteSession={handleDeleteSession}
            />
          </div>
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${showSidebar ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <CollapsedChatRail
              sessions={orderedSessions}
              activeSessionId={activeSessionId}
              onOpenSidebar={() => setShowSidebar(true)}
              onNewChat={handleNewChat}
              onSelectSession={handleSelectSession}
            />
          </div>
        </div>

        {/* Mobile Sidebar overlay */}
        <div
          className="fixed bottom-4 left-4 top-[84px] z-20 flex transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:left-6 md:hidden"
          style={{
            transform: showSidebar ? "translateX(0)" : "translateX(-110%)",
            pointerEvents: showSidebar ? "auto" : "none",
          }}
        >
          <ChatSidebar
            sessions={orderedSessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onToggle={() => setShowSidebar(false)}
            pinnedSessionIds={pinnedSessionIds}
            onRenameSession={handleRenameSession}
            onTogglePinSession={handleTogglePinSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        {/* Main content */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border transition-colors duration-200" style={{ background: 'var(--chat-bg)', borderColor: 'var(--border-color)' }}>
          {messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center">
              <div className="flex flex-col items-center w-full max-w-3xl mx-auto pb-12">
                <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.3" d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" fill="url(#ai_sparkle_glow)" />
                    <path d="M12 22C12 22 12 14.5 7 12C12 9.5 12 2 12 2C12 2 12 9.5 17 12C12 14.5 12 22 12 22Z" fill="var(--accent)"/>
                    <path d="M19.5 10C19.5 10 19.5 7.5 17.5 6.5C19.5 5.5 19.5 3 19.5 3C19.5 3 19.5 5.5 21.5 6.5C19.5 7.5 19.5 10 19.5 10Z" fill="var(--accent)"/>
                    <path d="M5.5 19C5.5 19 5.5 17 4 16C5.5 15 5.5 13 5.5 13C5.5 13 5.5 15 7 16C5.5 17 5.5 19 5.5 19Z" fill="var(--accent)"/>
                    <defs>
                      <radialGradient id="ai_sparkle_glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(9)">
                        <stop stopColor="var(--accent)"/>
                        <stop offset="1" stopColor="var(--accent)" stopOpacity="0"/>
                      </radialGradient>
                    </defs>
                  </svg>
                  <h1 className="text-center font-serif text-2xl font-normal sm:text-[32px]" style={{ color: "var(--text-primary)" }}>
                    {typedGreeting}
                  </h1>
                </div>
                <div className="w-full">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    disabled={streaming}
                    placeholderMode="crossfade"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loadingMessages && (
                  <div className="flex justify-center p-4">
                    <Spinner />
                  </div>
                )}

                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    sources={msg.sources}
                    createdAt={msg.createdAt}
                  />
                ))}

                {streaming && (
                  <>
                    {streamingContent ? (
                      <MessageBubble
                        role="assistant"
                        content={streamingContent}
                        createdAt={new Date().toISOString()}
                      />
                    ) : (
                      <TypingIndicator />
                    )}
                  </>
                )}

                {error && (
                  <Alert
                    color="failure"
                    className="mx-4"
                    onDismiss={() => setError("")}
                  >
                    {error}
                  </Alert>
                )}

                <div ref={bottomRef} />
              </div>
              
              <div className="border-t p-4 transition-colors duration-200 shrink-0" style={{ borderColor: 'var(--border-color)', background: 'var(--chat-bg)' }}>
                <div className="w-full max-w-5xl mx-auto">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    disabled={streaming}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Spinner size="xl" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
