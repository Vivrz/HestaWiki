import { cn } from "@/lib/utils";

type WordmarkTone = "dark" | "light";
type WordmarkSize = "sm" | "md";

export default function HestawikiWordmark({
  tone = "dark",
  size = "md",
  className,
}: {
  tone?: WordmarkTone;
  size?: WordmarkSize;
  className?: string;
}) {
  const isDark = tone === "dark";
  const isSmall = size === "sm";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          isSmall ? "text-sm" : "text-lg",
          isDark ? "text-white" : "text-slate-900",
        )}
      >
        Hestawiki
      </span>
      <span
        className={cn(
          "rounded-full border font-semibold uppercase tracking-widest",
          isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
          isDark
            ? "border-emerald-200/20 bg-emerald-400/10 text-emerald-200"
            : "border-emerald-300/40 bg-emerald-400/10 text-emerald-700",
        )}
      >
        Admin
      </span>
    </div>
  );
}
