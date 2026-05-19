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
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
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
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-lg font-semibold text-slate-900">No people found</p>
        <p className="mt-2 text-sm text-slate-500">Try changing your search or role filter.</p>
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
                isExpanded ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              aria-expanded={isExpanded}
            >
              <Avatar name={user.name} image={user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{user.name}</p>
                  <Badge variant={roleVariant[user.role]}>{user.role}</Badge>
                </div>
                <p className="truncate text-sm text-slate-600">
                  {user.email} · {user.totalSessions} chats · {user.totalMessages} messages
                </p>
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">
                {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
              </span>
              <HiChevronDown className={`h-4 w-4 text-slate-500 transition ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {isExpanded ? (
              <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {user.sessions.length} session{user.sessions.length === 1 ? "" : "s"}
                </p>
                {user.sessions.length === 0 ? (
                  <p className="text-sm text-slate-500">No chats yet.</p>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {user.sessions.map((session) => {
                      const isSessionOpen = expandedSessionId === session.id;
                      return (
                        <div key={session.id} className="rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setExpandedSessionId((prev) => (prev === session.id ? null : session.id))}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{session.title}</p>
                              <p className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })} · {session.messageCount} messages
                              </p>
                            </div>
                            <HiChevronDown className={`h-4 w-4 text-slate-500 transition ${isSessionOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isSessionOpen ? (
                            <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                              {session.messages.map((message) => {
                                const isUserMessage = message.role === "user";
                                return (
                                  <div key={message.id} className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                                    <div
                                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                                        isUserMessage ? "rounded-tr-md bg-sky-100 text-slate-900" : "rounded-tl-md bg-slate-100 text-slate-800"
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{message.content}</p>
                                      {message.sources?.length ? (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {message.sources.map((source, index) => (
                                            <span key={`${source.title}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
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
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
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
