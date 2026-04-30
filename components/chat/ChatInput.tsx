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
    <div className="border-t border-[#E5E3DC] bg-white p-4">
      <div className="flex items-end gap-3 rounded-[20px] border border-[#E5E3DC] bg-white p-3">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={disabled}
            className="resize-none border-0 text-[#1C1917] placeholder:text-[#6B6560] focus:ring-0"
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#4A4580] text-white transition hover:bg-[#3A3570] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <HiPaperAirplane className="h-5 w-5 rotate-90" />
        </button>
      </div>
    </div>
  );
}
