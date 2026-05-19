"use client";

import { useRef, KeyboardEvent } from "react";
import { Textarea } from "flowbite-react";
import { HiPaperAirplane } from "react-icons/hi";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        className="flex items-end gap-3 rounded-[20px] border p-3 transition-all duration-200 focus-within:ring-1 focus-within:ring-[var(--text-secondary)] focus-within:border-[var(--text-secondary)]" 
        style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
      >
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
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
