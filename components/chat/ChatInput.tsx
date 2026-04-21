"use client";

import { useRef, KeyboardEvent } from "react";
import { Button, Textarea } from "flowbite-react";
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
    <div className="border-t border-white/60 bg-white/65 p-4 backdrop-blur-xl">
      <div className="flex items-end gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={disabled}
            className="resize-none border-0 focus:ring-0"
          />
        </div>
        <Button
          color="cyan"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="mb-1 rounded-xl hover:bg-[#e56043]/90 focus:ring-0"
        >
          <HiPaperAirplane className="h-5 w-5 text-[#e56043] rotate-90" />
        </Button>
      </div>
    </div>
  );
}
