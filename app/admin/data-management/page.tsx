import DataManagementTabs from "@/components/admin/DataManagementTabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ tab?: string; dept?: string }>;
}

export default async function DataManagementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialTab = params.tab === "documents" ? "documents" : "upload";
  const initialDept = params.dept ?? "";

  return (
    <div className="space-y-6">
      <section className="admin-shell">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Data Management</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Add and manage answer sources</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
              Upload files or links, assign them to teams, and track whether they are ready for chat answers.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/departments">Manage departments</Link>
          </Button>
        </div>
      </section>

      <DataManagementTabs initialTab={initialTab} initialDept={initialDept} />
    </div>
  );
}
