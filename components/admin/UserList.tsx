"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HiChevronDown, HiOutlineDocumentText } from "react-icons/hi";
import type { AdminUser, UserRole } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const USERS_PER_PAGE = 8;

const roleVariant: Record<UserRole, "destructive" | "warning" | "secondary" | "success" | "default"> = {
  Admin: "destructive",
  HR: "warning",
  Engineer: "secondary",
  Finance: "success",
  Legal: "secondary",
  Designer: "secondary",
  User: "default",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) {
    return <img src={image} alt={`${name} avatar`} className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-panel-soft)] text-xs font-semibold text-[var(--admin-text)]">
      {getInitials(name)}
    </span>
  );
}

interface UserListProps {
  users: AdminUser[];
}

export default function UserList({ users }: UserListProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const paginatedUsers = users.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-10 text-center">
        <p className="text-lg font-semibold text-[var(--admin-text)]">No people found</p>
        <p className="mt-2 text-sm text-[var(--admin-text)]">Try changing your search or role filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paginatedUsers.map((user) => {
        const isExpanded = expandedUserId === user.id;

        return (
          <div key={user.id}>
            <button
              type="button"
              onClick={() => {
                setExpandedUserId((prev) => (prev === user.id ? null : user.id));
                setExpandedSessionId(null);
              }}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                isExpanded
                  ? "border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)]"
                  : "border-[var(--admin-panel-border)] bg-transparent hover:bg-[var(--admin-panel-soft)]"
              }`}
              aria-expanded={isExpanded}
            >
              <Avatar name={user.name} image={user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-[var(--admin-text)]">{user.name}</p>
                  <Badge variant={roleVariant[user.role]}>{user.role}</Badge>
                </div>
                <p className="truncate text-sm text-[var(--admin-text)]">
                  {user.email} · {user.totalSessions} chats · {user.totalMessages} messages
                </p>
              </div>
              <span className="hidden text-xs text-[var(--admin-text)] sm:block">
                {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
              </span>
              <HiChevronDown className={`h-4 w-4 text-[var(--admin-text)] transition ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {isExpanded ? (
              <div className="mt-1 rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--admin-text)]">
                  {user.sessions.length} session{user.sessions.length === 1 ? "" : "s"}
                </p>
                {user.sessions.length === 0 ? (
                  <p className="text-sm text-[var(--admin-text)]">No chats yet.</p>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {user.sessions.map((session) => {
                      const isSessionOpen = expandedSessionId === session.id;
                      return (
                        <div key={session.id} className="rounded-lg border border-[var(--admin-panel-border)]">
                          <button
                            type="button"
                            onClick={() => setExpandedSessionId((prev) => (prev === session.id ? null : session.id))}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[var(--admin-text)]">{session.title}</p>
                              <p className="text-xs text-[var(--admin-text)]">
                                {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })} · {session.messageCount} messages
                              </p>
                            </div>
                            <HiChevronDown className={`h-4 w-4 text-[var(--admin-text)] transition ${isSessionOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isSessionOpen ? (
                            <div className="space-y-2 border-t border-[var(--admin-panel-border)] px-3 py-3">
                              {session.messages.map((message) => {
                                const isUserMessage = message.role === "user";
                                return (
                                  <div key={message.id} className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                                    <div
                                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                                        isUserMessage
                                          ? "rounded-tr-md bg-white text-zinc-950"
                                          : "rounded-tl-md bg-[var(--admin-panel)] text-[var(--admin-text)]"
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{message.content}</p>
                                      {message.sources?.length ? (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {message.sources.map((source, index) => (
                                            <span
                                              key={`${source.title}-${index}`}
                                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                                                isUserMessage ? "bg-zinc-100 text-zinc-600" : "bg-[var(--admin-panel-soft)] text-[var(--admin-text)]"
                                              }`}
                                            >
                                              <HiOutlineDocumentText className="h-3 w-3" />
                                              {source.title}
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)]"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--admin-text)]">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)]"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
