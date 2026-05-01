export default function TypingIndicator() {
  return (
    <div className="mb-5 flex items-start gap-3" style={{ animation: "msgIn 150ms ease-out both" }}>
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white transition-colors duration-200" style={{ background: 'var(--accent)' }}>
        H
      </div>
      <div className="flex flex-col">
        <div className="mb-1.5 flex items-baseline gap-2">
          <p className="text-[13px] font-medium transition-colors duration-200" style={{ color: 'var(--text-primary)' }}>Hestabit Assistant</p>
        </div>
        <div className="flex gap-1.5 rounded-[4px_18px_18px_18px] border px-[18px] py-[16px] transition-colors duration-200" style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, background: 'var(--text-secondary)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
