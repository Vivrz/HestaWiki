"use client";

import { useState } from "react";
import { Badge, Avatar, Pagination } from "flowbite-react";
import { HiChevronDown, HiOutlineDocumentText } from "react-icons/hi";
import { formatDistanceToNow } from "date-fns";
import type { AdminUser, UserRole } from "./types";

const USERS_PER_PAGE = 10;

const roleBadgeColor: Record<UserRole, string> = {
  Admin: "failure",
  HR: "warning",
  Engineer: "info",
  Finance: "success",
  Legal: "purple",
  Designer: "pink",
  User: "gray",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface UserListProps {
  users: AdminUser[];
}

export default function UserList({ users }: UserListProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const paginatedUsers = users.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  const handleToggleUser = (id: string) => {
    setExpandedUserId((prev) => (prev === id ? null : id));
    setExpandedSessionId(null);
  };

  const handleToggleSession = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedUserId(null);
    setExpandedSessionId(null);
  };

  if (currentPage > totalPages) {
    setCurrentPage(1);
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No users found</p>
        <p className="mt-2 text-sm text-slate-500">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {paginatedUsers.map((user) => {
          const isExpanded = expandedUserId === user.id;
          const relativeTime = formatDistanceToNow(new Date(user.lastActive), {
            addSuffix: true,
          });

          return (
            <div key={user.id}>
              {/* Row button */}
              <button
                type="button"
                onClick={() => handleToggleUser(user.id)}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-all hover:ring-2 hover:ring-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/50 ${
                  isExpanded
                    ? "bg-slate-50 ring-2 ring-brand/20"
                    : "bg-white hover:bg-slate-50/80"
                }`}
                aria-expanded={isExpanded}
              >
                <Avatar
                  placeholderInitials={getInitials(user.name)}
                  rounded
                  size="md"
                  img={user.avatarUrl}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">
                      {user.name}
                    </span>
                    <Badge color={roleBadgeColor[user.role]} size="xs">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {user.email} · {user.department}
                    <span className="ml-2 text-slate-400">
                      {user.totalSessions} chats · {user.totalMessages} msgs
                    </span>
                  </p>
                </div>

                <span className="hidden text-sm text-slate-400 sm:block">
                  {relativeTime}
                </span>

                <HiChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded panel — clean chat history */}
              {isExpanded && (
                <div className="mt-1 rounded-xl bg-slate-50/60 px-4 py-3">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                    {user.sessions.length} session{user.sessions.length !== 1 ? "s" : ""}
                  </p>

                  {user.sessions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                      No chats yet.
                    </p>
                  ) : (
                    <div className="max-h-[480px] space-y-1 overflow-y-auto">
                      {user.sessions.map((session) => {
                        const isSessionOpen = expandedSessionId === session.id;
                        return (
                          <div key={session.id}>
                            {/* Session header */}
                            <button
                              type="button"
                              onClick={() => handleToggleSession(session.id)}
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                isSessionOpen
                                  ? "bg-white shadow-sm"
                                  : "hover:bg-white/70"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-slate-800">
                                  {session.title}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {formatDistanceToNow(new Date(session.startedAt), {
                                    addSuffix: true,
                                  })}{" "}
                                  · {session.messageCount} messages
                                </p>
                              </div>
                              <HiChevronDown
                                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
                                  isSessionOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {/* Messages */}
                            {isSessionOpen && (
                              <div className="space-y-2.5 px-3 pb-3 pt-2">
                                {session.messages.map((msg) => {
                                  const isUser = msg.role === "user";
                                  return (
                                    <div
                                      key={msg.id}
                                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                    >
                                      <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                          isUser
                                            ? "rounded-tr-md bg-brand/10 text-slate-900"
                                            : "rounded-tl-md bg-white text-slate-800 shadow-sm"
                                        }`}
                                      >
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        {msg.sources && msg.sources.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1.5">
                                            {msg.sources.map((s, i) => (
                                              <span
                                                key={i}
                                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                                              >
                                                <HiOutlineDocumentText className="h-3 w-3" />
                                                {s.title}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <p className="mt-1 text-[11px] text-slate-400">
                                          {formatDistanceToNow(new Date(msg.at), {
                                            addSuffix: true,
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
