"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { Alert, Button, Spinner } from "flowbite-react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import ChatInput from "@/components/chat/ChatInput";
import { HiLogout, HiShieldCheck, HiMenuAlt2 } from "react-icons/hi";

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

export default function ChatPage() {
  const { data: session } = useSession();
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

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

  const handleNewChat = async () => {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    if (res.ok) {
      const session = (await res.json()) as ChatSession;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    }
  };

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
    if (!trimmed || !activeSessionId || streaming) return;

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
        body: JSON.stringify({ sessionId: activeSessionId, message: trimmed }),
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#ecf2fd]">
      <header className="border-b border-white/60 bg-white px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar((s) => !s)}
              className="rounded-xl p-2 hover:bg-slate-100 md:hidden"
            >
              <HiMenuAlt2 className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Chat workspace
              </p>
              <h1 className="text-lg font-semibold text-slate-950">
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
                className="rounded-xl"
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
              className="rounded-xl"
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
          className={`h-full ${showSidebar ? "absolute inset-y-[76px] left-4 z-20 flex sm:left-6 md:static" : "hidden"} md:flex`}
        >
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </div>

        <div className="glass-panel flex min-w-0 flex-1 flex-col overflow-hidden ">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!activeSessionId && (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                  <svg
                    className="h-9 w-9"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  Start a conversation
                </p>
                <p className="mt-2 max-w-md text-sm leading-6">
                  Ask anything about your company knowledge base
                </p>
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
              />
            ))}

            {streaming && (
              <>
                {streamingContent ? (
                  <MessageBubble role="assistant" content={streamingContent} />
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
