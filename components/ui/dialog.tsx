import * as React from "react";
import { cn } from "@/lib/utils";
import { HiX } from "react-icons/hi";
import { Button } from "@/components/ui/button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
}: DialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-[7px] border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] shadow-2xl",
          maxWidthClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--admin-heading)]">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-primary)]"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
          >
            <HiX className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-[var(--admin-border)] px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
