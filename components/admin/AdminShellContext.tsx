"use client";

import { createContext, useContext } from "react";

type AdminShellContextValue = {
  isDesktopSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({
  value,
  children,
}: {
  value: AdminShellContextValue;
  children: React.ReactNode;
}) {
  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (!context) {
    throw new Error("useAdminShell must be used within an AdminShellProvider");
  }
  return context;
}
