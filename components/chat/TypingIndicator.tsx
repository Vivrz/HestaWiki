export default function TypingIndicator() {
  return (
    <div className="mb-10 flex items-start gap-3" style={{ animation: "msgIn 150ms ease-out both" }}>
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white transition-colors duration-200" style={{ background: 'var(--accent)' }}>
        H
      </div>
      <div className="flex flex-col">
        <div className="mb-3 flex items-baseline gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200" style={{ color: 'var(--accent)' }}>Hestawiki AI</p>
        </div>
        <div className="flex gap-1.5 px-0 py-1 transition-colors duration-200">
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
