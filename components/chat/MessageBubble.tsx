"use client";

import { useSession } from "next-auth/react";

interface Source {
  docId: string;
  docName: string;
  department: string;
  version: number;
  chunkIndex: number;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  createdAt?: string;
}

export default function MessageBubble({
  role,
  content,
  sources: _sources,
  createdAt,
}: MessageBubbleProps) {
  const { data: session } = useSession();
  const isUser = role === "user";

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "JD";

  const timestamp = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  const renderAssistantContent = () => {
    const paragraphs = content
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    return paragraphs.map((paragraph, index) => {
      const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
      const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
      const unordered = lines.every((line) => /^[-*]\s+/.test(line));

      if (ordered) {
        return (
          <ol key={`ol-${index}`} className="my-2 list-decimal space-y-2 pl-5">
            {lines.map((line, lineIndex) => (
              <li key={`ol-line-${lineIndex}`} className="text-[14px] leading-relaxed transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
                {line.replace(/^\d+\.\s+/, "")}
              </li>
            ))}
          </ol>
        );
      }

      if (unordered) {
        return (
          <ul key={`ul-${index}`} className="my-2 list-disc space-y-2 pl-5">
            {lines.map((line, lineIndex) => (
              <li key={`ul-line-${lineIndex}`} className="text-[14px] leading-relaxed transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
                {line.replace(/^[-*]\s+/, "")}
              </li>
            ))}
          </ul>
        );
      }

      const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={`p-${index}`} className="mb-3 last:mb-0 whitespace-pre-wrap">
          {parts.map((part, partIndex) =>
            /^\*\*[^*]+\*\*$/.test(part) ? (
              <strong key={`strong-${partIndex}`} className="font-medium">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={`span-${partIndex}`}>{part}</span>
            ),
          )}
        </p>
      );
    });
  };

  return (
    <div
      className={`mb-5 ${isUser ? "flex items-end justify-end gap-2" : "flex items-start gap-3"}`}
      style={{ animation: "msgIn 150ms ease-out both" }}
    >
      {isUser ? (
        <>
          <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%] lg:max-w-[65%] xl:max-w-[720px]">
            <div className="rounded-[18px_18px_4px_18px] px-4 py-[11px] text-[14px] leading-relaxed text-white transition-colors duration-200" style={{ background: 'var(--accent)' }}>
              <p className="whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>{content}</p>
            </div>
            {timestamp && <p className="mr-9 mt-1 text-right text-[11px] transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>{timestamp}</p>}
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-200" style={{ background: 'var(--hover-bg)', color: 'var(--accent)' }}>
            {userInitials}
          </div>
        </>
      ) : (
        <>
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white transition-colors duration-200" style={{ background: 'var(--accent)' }}>
            H
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-1.5 flex items-baseline gap-2">
              <p className="text-[13px] font-medium transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>Hestabit Assistant</p>
              {timestamp && <p className="text-[11px] transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>{timestamp}</p>}
            </div>
            <div className="max-w-full rounded-[4px_18px_18px_18px] border px-[18px] py-[14px] text-[14px] leading-[1.75] transition-colors duration-200 break-words sm:max-w-[95%] xl:max-w-[900px]" style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', overflowWrap: "anywhere" }}>
              {renderAssistantContent()}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
