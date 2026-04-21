import AdminSidebar from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <div className="hidden shrink-0 md:block">
        <AdminSidebar />
      </div>
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="mb-4 rounded-2xl border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur md:hidden">
            Admin workspace
          </div>
          <div className="flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
