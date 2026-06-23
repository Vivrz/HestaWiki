"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HiChevronDown } from "react-icons/hi";
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
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-lightprimary)] text-xs font-bold text-[var(--admin-primary)]">
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
      <div className="rounded-[7px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-background)] p-10 text-center">
        <p className="text-lg font-bold text-[var(--admin-heading)]">No people found</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">Try changing your search or role filter.</p>
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
              className={`flex w-full items-center gap-3 rounded-[7px] border px-4 py-3 text-left transition ${
                isExpanded
                  ? "border-[var(--admin-border)] bg-[var(--admin-background)]"
                  : "border-[var(--admin-border)] bg-transparent hover:bg-[var(--admin-background)]"
              }`}
              aria-expanded={isExpanded}
            >
              <Avatar name={user.name} image={user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-[var(--admin-heading)]">{user.name}</p>
                  <Badge variant={roleVariant[user.role]}>{user.role}</Badge>
                </div>
                <p className="truncate text-sm text-[var(--admin-muted)]">
                  {user.email} · {user.totalSessions} chats · {user.totalMessages} messages
                </p>
              </div>
              <span className="hidden text-xs text-[var(--admin-muted)] sm:block">
                {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
              </span>
              <HiChevronDown className={`h-4 w-4 text-[var(--admin-muted)] transition ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {isExpanded ? (
              <div className="mt-2 rounded-[7px] border border-[var(--admin-border)] bg-[var(--admin-background)] p-3">
                <p className="mb-2 text-xs font-bold uppercase text-[var(--admin-muted)]">
                  {user.sessions.length} session{user.sessions.length === 1 ? "" : "s"}
                </p>
                {user.sessions.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">No chats yet.</p>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {user.sessions.map((session) => {
                      const isSessionOpen = expandedSessionId === session.id;
                      return (
                        <div key={session.id} className="rounded-[7px] border border-[var(--admin-border)] bg-[var(--admin-card)]">
                          <button
                            type="button"
                            onClick={() => setExpandedSessionId((prev) => (prev === session.id ? null : session.id))}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--admin-heading)]">{session.title}</p>
                              <p className="text-xs text-[var(--admin-muted)]">
                                {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })} · {session.messageCount} messages
                              </p>
                            </div>
                            <HiChevronDown className={`h-4 w-4 text-[var(--admin-muted)] transition ${isSessionOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isSessionOpen ? (
                            <div className="space-y-2 border-t border-[var(--admin-border)] px-3 py-3">
                              {session.messages.map((message) => {
                                const isUserMessage = message.role === "user";
                                return (
                                  <div key={message.id} className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                                    <div
                                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                                        isUserMessage
                                          ? "rounded-tr-md bg-[var(--admin-primary)] text-white"
                                          : "rounded-tl-md bg-[var(--admin-background)] text-[var(--admin-muted)]"
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{message.content}</p>
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
            className="border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--admin-muted)]">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"
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
