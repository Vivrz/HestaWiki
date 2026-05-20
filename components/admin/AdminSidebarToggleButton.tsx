"use client";

import { HiMenuAlt2 } from "react-icons/hi";
import { useAdminShell } from "@/components/admin/AdminShellContext";

export default function AdminSidebarToggleButton() {
  const { isDesktopSidebarOpen, toggleSidebar } = useAdminShell();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={isDesktopSidebarOpen ? "Collapse admin sidebar" : "Expand admin sidebar"}
      title={isDesktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      className="hidden h-11 w-11 items-center justify-center rounded-xl bg-[var(--admin-button)] text-[var(--admin-button-text)] shadow-sm transition hover:bg-black sm:flex"
    >
      <HiMenuAlt2 className="h-5 w-5" />
    </button>
  );
}
