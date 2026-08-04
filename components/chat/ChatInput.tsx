"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Textarea } from "flowbite-react";
import { HiPaperAirplane } from "react-icons/hi";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholderMode?: "static" | "crossfade";
}

const PLACEHOLDER_PHRASES = ["Ask anything about the company...", "Type your message..."];

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholderMode = "static",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeletingPlaceholder, setIsDeletingPlaceholder] = useState(false);

  useEffect(() => {
    if (placeholderMode !== "crossfade") return;
    if (value.trim()) return;

    const phrase = PLACEHOLDER_PHRASES[placeholderIndex];
    const phraseComplete = !isDeletingPlaceholder && placeholderText === phrase;
    const phraseDeleted = isDeletingPlaceholder && placeholderText === "";
    const delay = phraseComplete ? 1200 : phraseDeleted ? 250 : isDeletingPlaceholder ? 30 : 55;

    const timeout = window.setTimeout(() => {
      if (phraseComplete) {
        setIsDeletingPlaceholder(true);
        return;
      }

      if (phraseDeleted) {
        setIsDeletingPlaceholder(false);
        setPlaceholderIndex((index) => (index + 1) % PLACEHOLDER_PHRASES.length);
        return;
      }

      setPlaceholderText((current) =>
        isDeletingPlaceholder
          ? phrase.slice(0, Math.max(current.length - 1, 0))
          : phrase.slice(0, current.length + 1),
      );
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [isDeletingPlaceholder, placeholderIndex, placeholderMode, placeholderText, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="w-full">
      <div
        className="flex items-end gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 focus-within:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] focus-within:ring-2 focus-within:ring-[var(--accent)]/25 focus-within:border-[var(--accent)] sm:px-5"
        style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
      >
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderMode === "crossfade" ? placeholderText : "Ask anything about the company..."}
            rows={1}
            disabled={disabled}
            className="max-h-32 min-h-[2.25rem] w-full resize-none border-0 px-0 py-1.5 text-sm focus:ring-0"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => onSend()}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_6px_18px_-6px_var(--accent)] transition-all duration-200 enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          <HiPaperAirplane aria-hidden="true" className="h-4 w-4 rotate-90" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between px-1">
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          Hestawiki AI can make mistakes. Verify important information.
        </p>
        <p className="hidden text-[11px] sm:block" style={{ color: "var(--text-secondary)" }}>
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
