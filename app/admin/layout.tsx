"use client";

import { useState } from "react";
import AdminSidebar, { AdminCollapsedRail, SidebarContent } from "@/components/admin/Sidebar";
import { AdminShellProvider } from "@/components/admin/AdminShellContext";
import HestawikiWordmark from "@/components/admin/HestawikiWordmark";
import { HiMenuAlt2, HiX } from "react-icons/hi";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setDrawerOpen((prev) => !prev);
      return;
    }

    setDesktopSidebarOpen((prev) => !prev);
  };

  return (
    <AdminShellProvider value={{ isDesktopSidebarOpen: desktopSidebarOpen, toggleSidebar }}>
      <div
        className="flex h-screen overflow-hidden text-slate-950"
        style={{
          background: "linear-gradient(to bottom, #e4e4e4 0, #e4e4e4 45%, #262626 45%, #262626 100%)",
        }}
      >
        <div className="hidden shrink-0 p-4 md:block lg:p-6">
          <div
            className="relative h-[calc(100vh-2rem)] overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:h-[calc(100vh-3rem)]"
            style={{ width: desktopSidebarOpen ? "18rem" : "3.5rem" }}
            aria-label="Admin sidebar region"
          >
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${
                desktopSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <AdminSidebar />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${
                desktopSidebarOpen ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              <AdminCollapsedRail />
            </div>
          </div>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50"
              aria-label="Close navigation menu"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute left-3 top-3 h-[calc(100%-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-[24px] bg-[var(--admin-button)] shadow-2xl">
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

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1380px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-black/10 bg-white/55 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur md:hidden">
              <button
                type="button"
                onClick={toggleSidebar}
                className="rounded-xl p-1.5 hover:bg-black/5"
                aria-label="Open navigation menu"
              >
                <HiMenuAlt2 className="h-5 w-5" />
              </button>
              <HestawikiWordmark tone="light" size="sm" />
            </div>
            <div className="flex-1">{children}</div>
          </div>
        </main>
      </div>
    </AdminShellProvider>
  );
}
