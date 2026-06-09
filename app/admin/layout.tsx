import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import AdminShell from "@/components/admin/AdminShell";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-admin",
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={plusJakarta.variable}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
