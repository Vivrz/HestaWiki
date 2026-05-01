"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, Button, Spinner } from "flowbite-react";
import ChatSidebar from "@/components/chat/ChatSidebar";
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

const suggestions = [
  { label: "What's the leave policy?", icon: HiClipboardList },
  { label: "How do I raise a ticket?", icon: HiTicket },
  { label: "Work from home rules", icon: HiWifi },
  { label: "Maternity leave duration", icon: HiUserGroup },
];

export default function ChatPage() {
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back,");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning,");
    else if (hour < 17) setGreeting("Good afternoon,");
    else setGreeting("Good evening,");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (res.ok) {
      const data = (await res.json()) as ChatSession[];
      setSessions(data);
    }
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
    if (res.ok) {
      const data = (await res.json()) as Message[];
      setMessages(data);
    }
    setLoadingMessages(false);
  }, []);

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    fetchMessages(id);
  };

  const handleNewChat = useCallback(async () => {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    if (res.ok) {
      const session = (await res.json()) as ChatSession;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initSession = async () => {
      await fetchSessions();
      
      const isNewLogin = searchParams.get("new") === "true";
      
      if (isNewLogin) {
        // Immediately clean up the URL to prevent refresh loops
        router.replace("/chat");
        // Start a fresh session
        handleNewChat();
      } else {
        // Resume the most recent session if it exists
        setSessions((currentSessions) => {
          if (currentSessions.length > 0 && !activeSessionId) {
            setActiveSessionId(currentSessions[0].id);
            fetchMessages(currentSessions[0].id);
          }
          return currentSessions;
        });
      }
    };
    initSession();
  }, [fetchSessions, handleNewChat, searchParams, activeSessionId, fetchMessages]); // Only run on mount to trigger the initial logic

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
      <header className="border-b px-4 py-4 sm:px-6 transition-colors duration-200" style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar((s) => !s)}
              className="rounded-xl p-2 text-[#6B6560] hover:bg-[#ECEAE4] md:hidden"
            >
              <HiMenuAlt2 className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6B6560]">
                Chat workspace
              </p>
              <h1 className="text-lg font-semibold text-[#1C1917]">
                Enterprise Chatbot
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
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
                  <span>Admin</span>
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
                <span>Sign Out</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 justify-center overflow-hidden px-4 py-4 sm:px-6 gap-4">
        {/* Sidebar wrapper — animates width */}
        <div style={{
          width: showSidebar ? '288px' : '0px',
          minWidth: showSidebar ? '288px' : '0px',
          overflow: 'hidden',
          transition: 'width 250ms ease-in-out, min-width 250ms ease-in-out',
          flexShrink: 0,
        }} className="hidden md:block">
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onToggle={() => setShowSidebar(false)}
          />
        </div>

        {/* Mobile Sidebar overlay */}
        <div className={`h-full md:hidden ${showSidebar ? "absolute inset-y-[84px] left-4 z-20 flex sm:left-6" : "hidden"}`}>
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onToggle={() => setShowSidebar(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border transition-colors duration-200 relative" style={{ background: 'var(--chat-bg)', borderColor: 'var(--border-color)' }}>
          {/* Floating re-open button — only when sidebar is closed */}
          {!showSidebar && (
            <button
              className="hidden md:flex"
              onClick={() => setShowSidebar(true)}
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                zIndex: 50,
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--sidebar-bg)',
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
              title="Open sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}
          {messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center">
              <div className="flex flex-col items-center w-full max-w-3xl mx-auto pb-12">
                <div className="flex items-center justify-center gap-4 mb-8">
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
                  <h1 style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: "32px", fontWeight: "400", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                    {greeting} {firstName}
                  </h1>
                </div>
                <div className="w-full">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    disabled={streaming}
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
