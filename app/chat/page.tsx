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
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F6F3] text-[#1C1917]">
      <header className="border-b border-[#E5E3DC] bg-[#F7F6F3] px-4 py-4 sm:px-6">
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
            {session?.user.role === "admin" && (
              <Button
                color="gray"
                size="md"
                href="/admin"
                className="rounded-xl border border-[#E5E3DC] bg-white text-[#1C1917] hover:bg-[#ECEAE4]"
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
              className="rounded-xl border border-[#E5E3DC] bg-white text-[#1C1917] hover:bg-[#ECEAE4]"
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

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 overflow-hidden px-4 py-4 sm:px-6">
        <div
          className={`h-full ${showSidebar ? "absolute inset-y-[84px] left-4 z-20 flex sm:left-6 md:static" : "hidden"} md:flex`}
        >
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E5E3DC] bg-white">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#4A4580] text-xl font-semibold text-white">
                  H
                </div>
                <p className="text-[20px] font-medium tracking-[-0.01em] text-[#1C1917]">
                  Hello, {firstName}
                </p>
                <p className="mt-1.5 max-w-sm text-center text-[14px] leading-relaxed text-[#6B6560]">
                  Ask me anything about company policies, HR, or procedures.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.label)}
                        className="flex cursor-pointer select-none items-center gap-2.5 rounded-2xl border border-[#E5E3DC] bg-white px-4 py-2.5 text-[13px] text-[#1C1917] transition-all duration-[120ms] hover:-translate-y-[1px] hover:border-[#4A4580] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      >
                        <Icon className="h-4 w-4 text-[#6B6560]" />
                        <span>{suggestion.label}</span>
                        <HiChevronRight className="h-3.5 w-3.5 text-[#6B6560]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={streaming}
          />
        </div>
      </div>
    </div>
  );
}
