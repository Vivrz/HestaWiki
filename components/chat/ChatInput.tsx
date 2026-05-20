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

const PLACEHOLDER_PHRASES = ["How can I help you today?", "Type your message..."];

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
        className="flex items-end gap-2 rounded-[20px] border p-3 transition-all duration-200 focus-within:ring-1 focus-within:ring-[var(--text-secondary)] focus-within:border-[var(--text-secondary)] sm:gap-3" 
        style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
      >
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderMode === "crossfade" ? placeholderText : "Type your message..."}
            rows={3}
            disabled={disabled}
            className="resize-none border-0 focus:ring-0 w-full"
            style={{ 
              background: 'transparent',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
        >
          <HiPaperAirplane aria-hidden="true" className="h-5 w-5 rotate-90" />
        </button>
      </div>
    </div>
  );
}
