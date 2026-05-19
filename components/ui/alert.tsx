import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "success";

const alertVariantClasses: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-800",
  destructive: "border-rose-200 bg-rose-50 text-rose-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-lg border px-4 py-3 text-sm", alertVariantClasses[variant], className)}
      {...props}
    />
  );
}
