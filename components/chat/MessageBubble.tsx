"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { HiLightningBolt, HiOutlineClipboardCopy, HiCheck } from "react-icons/hi";

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

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

function textWithLinks(text: string) {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (/^(https?:\/\/|www\.)/.test(part)) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={`link-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[var(--accent)]/40 underline-offset-2 transition-colors hover:decoration-[var(--accent)]"
          style={{ color: "var(--accent)" }}
        >
          {part}
        </a>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

function RichParagraph({ text }: { text: string }) {
  if (/^#{1,3}\s/.test(text)) {
    const level = text.match(/^(#{1,3})\s/)?.[1].length ?? 2;
    const content = text.replace(/^#{1,3}\s+/, "");
    const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
    return (
      <Tag
        className="mb-2 mt-4 font-semibold first:mt-0"
        style={{ color: "var(--text-primary)", fontSize: level === 1 ? "1.05rem" : level === 2 ? "1rem" : "0.95rem" }}
      >
        {renderInline(content)}
      </Tag>
    );
  }

  if (/^(-{3,}|\*{3,})$/.test(text.trim())) {
    return <hr className="my-4 border-0 h-px" style={{ background: "var(--border-color)" }} />;
  }

  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <p className="mb-3 whitespace-pre-wrap last:mb-0">
      <span style={{ color: "var(--text-primary)" }}>
        {parts.map((part, i) =>
          /^\*\*[^*]+\*\*$/.test(part) ? (
            <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
          ) : /^`[^`]+`$/.test(part) ? (
            <code
              key={i}
              className="rounded-md px-1.5 py-0.5 text-[13px]"
              style={{ background: "var(--hover-bg)", color: "var(--text-primary)" }}
            >
              {part.slice(1, -1)}
            </code>
          ) : (
            <span key={i}>{textWithLinks(part)}</span>
          )
        )}
      </span>
    </p>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return (
      <code key={i} className="rounded-md px-1 py-0.5 text-[13px]" style={{ background: "var(--hover-bg)" }}>{part.slice(1, -1)}</code>
    );
    return <span key={i}>{textWithLinks(part)}</span>;
  });
}

export default function MessageBubble({
  role,
  content,
  sources: _sources,
  createdAt,
}: MessageBubbleProps) {
  const { data: session } = useSession();
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const renderAssistantContent = () => {
    const paragraphs = content
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    let orderedListNextStart = 1;
    let previousWasOrderedList = false;

    return paragraphs.map((paragraph, index) => {
      const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
      const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
      const unordered = lines.every((line) => /^[-*]\s+/.test(line));

      if (ordered) {
        const explicitStart = Number(lines[0]?.match(/^(\d+)\.\s+/)?.[1] ?? "1");
        const start = previousWasOrderedList && explicitStart <= orderedListNextStart
          ? orderedListNextStart
          : explicitStart;

        orderedListNextStart = start + lines.length;
        previousWasOrderedList = true;

        return (
          <ol key={`ol-${index}`} start={start} className="my-2 space-y-2 pl-5">
            {lines.map((line, lineIndex) => (
              <li key={`ol-line-${lineIndex}`} className="list-decimal text-[14px] leading-relaxed transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
                {renderInline(line.replace(/^\d+\.\s+/, ""))}
              </li>
            ))}
          </ol>
        );
      }

      previousWasOrderedList = false;
      orderedListNextStart = 1;

      if (unordered) {
        return (
          <ul key={`ul-${index}`} className="my-2 space-y-2 pl-5">
            {lines.map((line, lineIndex) => (
              <li key={`ul-line-${lineIndex}`} className="list-disc text-[14px] leading-relaxed transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>
                {renderInline(line.replace(/^[-*]\s+/, ""))}
              </li>
            ))}
          </ul>
        );
      }

      return <RichParagraph key={`p-${index}`} text={paragraph} />;
    });
  };

  return (
    <div
      className={`mb-5 ${isUser ? "flex items-end justify-end gap-2" : "flex items-start gap-3"}`}
      style={{ animation: "msgIn 150ms ease-out both" }}
    >
      {isUser ? (
        <>
          <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%] lg:max-w-[58%] xl:max-w-[640px]">
            <div className="rounded-[22px_4px_22px_22px] px-5 py-4 text-[14px] leading-relaxed text-white transition-colors duration-200" style={{ background: 'var(--accent)' }}>
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
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_-4px_var(--accent)] transition-colors duration-200" style={{ background: 'var(--accent)' }}>
            <HiLightningBolt className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200" style={{ color: 'var(--accent)' }}>Hestawiki AI</p>
              {timestamp && <p className="text-[11px] transition-colors duration-200" style={{ color: 'var(--text-secondary)' }}>{timestamp}</p>}
            </div>
            <div className="max-w-full text-[15px] leading-[1.7] transition-colors duration-200 break-words sm:max-w-[92%] xl:max-w-[820px]" style={{ color: 'var(--text-primary)', overflowWrap: "anywhere" }}>
              {renderAssistantContent()}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy response"
                title="Copy response"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
                style={{
                  background: "transparent",
                  borderColor: "var(--border-color)",
                  color: copied ? "var(--accent)" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {copied ? <HiCheck className="h-3.5 w-3.5" /> : <HiOutlineClipboardCopy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
