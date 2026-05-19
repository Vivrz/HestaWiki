"use client";

import { useState } from "react";
import AdminSidebar, { SidebarContent } from "@/components/admin/Sidebar";
import { HiMenuAlt2, HiX } from "react-icons/hi";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      <div className="hidden shrink-0 md:block">
        <AdminSidebar />
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 bg-slate-950 shadow-2xl">
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-xl p-2 text-white/90 hover:bg-white/10"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur md:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-1.5 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <HiMenuAlt2 className="h-5 w-5" />
            </button>
            <span className="font-medium">Hestawiki Admin</span>
          </div>
          <div className="flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
