"use client";

import { HiOutlineArrowDown, HiOutlineMoon, HiX } from "react-icons/hi";

interface ChatSettingsModalProps {
  open: boolean;
  isDark: boolean;
  autoScroll: boolean;
  onToggleTheme: () => void;
  onToggleAutoScroll: () => void;
  onClose: () => void;
}

export default function ChatSettingsModal({
  open,
  isDark,
  autoScroll,
  onToggleTheme,
  onToggleAutoScroll,
  onClose,
}: ChatSettingsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="w-full max-w-sm rounded-2xl border px-5 py-4 shadow-2xl"
        style={{ background: "var(--header-bg)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Settings
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Appearance
            </p>
            <div
              className="mt-2 rounded-xl border px-4 py-3"
              style={{ background: "var(--input-bg)", borderColor: "var(--border-color)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--hover-bg)", color: "var(--accent)" }}
                  >
                    <HiOutlineMoon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      Dark mode
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Use a darker chat theme
                    </p>
                  </div>
                </div>
                <ToggleSwitch checked={isDark} onChange={onToggleTheme} label="Dark mode" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Conversation
            </p>
            <div
              className="mt-2 rounded-xl border px-4 py-3"
              style={{ background: "var(--input-bg)", borderColor: "var(--border-color)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--hover-bg)", color: "var(--accent)" }}
                  >
                    <HiOutlineArrowDown className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      Auto-scroll
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Keep the latest message in view
                    </p>
                  </div>
                </div>
                <ToggleSwitch checked={autoScroll} onChange={onToggleAutoScroll} label="Auto-scroll" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--accent)" : "var(--border-color)" }}
    >
      <span
        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
