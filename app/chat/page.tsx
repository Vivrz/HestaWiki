"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, Spinner } from "flowbite-react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import CollapsedChatRail from "@/components/chat/CollapsedChatRail";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import ChatInput from "@/components/chat/ChatInput";
import RateLimitToast, { type RateLimitNotice } from "@/components/ui/RateLimitToast";
import RateLimitCountdownBadge from "@/components/ui/RateLimitCountdownBadge";
import { usePersistentRateLimitCountdown } from "@/components/ui/useRateLimitCountdown";
import { readRateLimitNotice } from "@/lib/rate-limit-client";
import {
  HiLogout,
  HiMenuAlt2,
  HiShieldCheck,
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
const CHAT_RATE_LIMIT_STORAGE_KEY = "rate-limit:chat";

const STARTER_PROMPTS = [
  { icon: "solar:document-text-linear", title: "Summarize a policy", prompt: "Summarize the company's leave policy in a few bullet points." },
  { icon: "solar:question-circle-linear", title: "Answer a question", prompt: "What are the steps to submit an expense reimbursement?" },
  { icon: "solar:users-group-rounded-linear", title: "Find a team contact", prompt: "Who should I contact about IT onboarding issues?" },
  { icon: "solar:shield-user-linear", title: "Understand compliance", prompt: "What are the key compliance guidelines for handling customer data?" },
];

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
  const {
    toastNotice: rateLimitToastNotice,
    active: rateLimitActive,
    remainingSeconds: rateLimitRemainingSeconds,
    startRateLimit,
    dismissToast: dismissRateLimitToast,
  } = usePersistentRateLimitCountdown(CHAT_RATE_LIMIT_STORAGE_KEY);
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
    if (typeof window === "undefined") return;
    setShowSidebar(window.matchMedia("(min-width: 768px)").matches);
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

  const activeSessionTitle = sessions.find((session) => session.id === activeSessionId)?.title;

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
    setMessages([]);
    fetchMessages(id);
  };

  const canCreateNewChat =
    !activeSessionId || messages.some((message) => message.role === "user");

  const handleNewChat = useCallback(async () => {
    if (!canCreateNewChat || streaming) return;

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
  }, [canCreateNewChat, handleAuthExpired, streaming]);

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

  const handleSend = async (overrideMessage?: string) => {
    const trimmed = (overrideMessage ?? input).trim();
    if (!trimmed || streaming || rateLimitActive) return;

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

    const optimisticMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: optimisticMessageId, role: "user", content: trimmed, createdAt: new Date().toISOString() },
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
      if (res.status === 429) {
        const notice = await readRateLimitNotice(res);
        startRateLimit(notice);
        setMessages((prev) => prev.filter((message) => message.id !== optimisticMessageId));
        setInput(trimmed);
        return;
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

  const handleStarterPrompt = (prompt: string) => {
    setInput(prompt);
    handleSend(prompt);
  };

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-200" style={{ background: 'var(--chat-bg)', color: 'var(--text-primary)' }}>
      <RateLimitToast notice={rateLimitToastNotice} onDismiss={dismissRateLimitToast} />
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
      {showSidebar ? (
        <div
          className="flex h-full w-14 shrink-0 flex-col items-center border-r px-2 py-5 transition-colors duration-200"
          style={{ background: "var(--header-bg)", borderColor: "var(--border-color)" }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ color: "var(--accent)" }} aria-label="Hestawiki">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="6" r="2" fill="currentColor" />
              <circle cx="18" cy="6" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="6" cy="18" r="2" fill="currentColor" />
              <circle cx="18" cy="18" r="2" fill="currentColor" />
              <path d="M7.7 7.1 10.3 10M16.3 7.1 13.7 10M7.7 16.9 10.3 14M16.3 16.9 13.7 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      ) : (
        <CollapsedChatRail
          sessions={orderedSessions}
          activeSessionId={activeSessionId}
          onOpenSidebar={() => setShowSidebar(true)}
          onNewChat={handleNewChat}
          newChatDisabled={!canCreateNewChat || streaming}
          onSelectSession={handleSelectSession}
        />
      )}

      <div
        className="relative hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:block"
        style={{ width: showSidebar ? "260px" : "0px" }}
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
            newChatDisabled={!canCreateNewChat || streaming}
            onToggle={() => setShowSidebar(false)}
            pinnedSessionIds={pinnedSessionIds}
            onRenameSession={handleRenameSession}
            onTogglePinSession={handleTogglePinSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>
      </div>

      <div
        className="fixed bottom-0 left-14 top-0 z-40 flex transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:hidden"
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
          newChatDisabled={!canCreateNewChat || streaming}
          onToggle={() => setShowSidebar(false)}
          pinnedSessionIds={pinnedSessionIds}
          onRenameSession={handleRenameSession}
          onTogglePinSession={handleTogglePinSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-colors duration-200 sm:px-8" style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setShowSidebar((s) => !s)}
              className="rounded-lg p-2 transition-colors md:hidden"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              aria-label="Toggle sidebar"
            >
              <HiMenuAlt2 className="h-5 w-5" />
            </button>
            <span
              className="hidden h-6 w-6 items-center justify-center rounded-lg sm:flex"
              style={{ background: "var(--accent)" }}
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 22c0-7.5 0-10-5-10 5-2.5 5-5 5-10 0 5 0 7.5 5 10-5 2.5-5 5-5 10z" fill="white" />
              </svg>
            </span>
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg" style={{ color: "var(--text-primary)" }}>
                {activeSessionTitle || "Hestawiki"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={!canCreateNewChat || streaming}
              className="hidden h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-color)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              New chat
            </button>
            <RateLimitCountdownBadge remainingSeconds={rateLimitRemainingSeconds} />
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ background: 'transparent', color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
              <a
                href="/admin"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Admin"
                aria-label="Admin"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <HiShieldCheck className="h-5 w-5" />
              </a>
            )}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign out"
              aria-label="Sign out"
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <HiLogout className="h-5 w-5" />
            </button>
          </div>
      </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-200" style={{ background: 'var(--chat-bg)' }}>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-8 sm:px-8 lg:px-12">
            <div className={`mx-auto flex min-h-full w-full max-w-[920px] flex-col ${messages.length === 0 ? "justify-center" : "justify-start"}`}>
              {messages.length === 0 ? (
                <div className="mx-auto flex w-full max-w-3xl flex-col items-center pb-10">
                  <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                      style={{ background: "var(--accent)" }}
                      aria-hidden="true"
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C12 22 12 14.5 7 12C12 9.5 12 2 12 2C12 2 12 9.5 17 12C12 14.5 12 22 12 22Z" fill="white"/>
                        <path d="M19.5 10C19.5 10 19.5 7.5 17.5 6.5C19.5 5.5 19.5 3 19.5 3C19.5 3 19.5 5.5 21.5 6.5C19.5 7.5 19.5 10 19.5 10Z" fill="white"/>
                        <path d="M5.5 19C5.5 19 5.5 17 4 16C5.5 15 5.5 13 5.5 13C5.5 13 5.5 15 7 16C5.5 17 5.5 19 5.5 19Z" fill="white"/>
                      </svg>
                    </span>
                    <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-[30px]" style={{ color: "var(--text-primary)" }}>
                      {typedGreeting}
                    </h2>
                  </div>
                  <p className="mb-8 -mt-2 max-w-md text-center text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    Your AI assistant for company knowledge. Ask questions, summarize documents, or get answers backed by your internal sources.
                  </p>
                  <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.title}
                        type="button"
                        onClick={() => handleStarterPrompt(prompt.prompt)}
                        className="group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          background: "var(--input-bg)",
                          borderColor: "var(--border-color)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                      >
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: "var(--hover-bg)", color: "var(--accent)" }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            {prompt.icon === "solar:document-text-linear" ? (
                              <><path d="M7 3h6l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4M9 13h6M9 17h4" /></>
                            ) : prompt.icon === "solar:question-circle-linear" ? (
                              <><circle cx="12" cy="12" r="9" /><path d="M9.3 9a2.6 2.6 0 0 1 5.1.6c0 1.6-2.4 2.1-2.4 3.4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></>
                            ) : prompt.icon === "solar:users-group-rounded-linear" ? (
                              <><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 19v-1a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8" /></>
                            ) : (
                              <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                            )}
                          </svg>
                        </span>
                        <span>
                          <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{prompt.title}</span>
                          <span className="mt-1 block text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{prompt.prompt}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pb-10 pt-6">
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
              )}
            </div>
          </div>

          <div className="shrink-0 px-4 pb-8 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-[832px]">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                disabled={streaming || rateLimitActive}
                placeholderMode={messages.length === 0 ? "crossfade" : "static"}
              />
            </div>
          </div>
        </main>
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
