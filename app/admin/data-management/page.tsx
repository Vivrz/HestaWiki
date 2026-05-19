import DataManagementTabs from "@/components/admin/DataManagementTabs";

interface PageProps {
  searchParams: Promise<{ tab?: string; dept?: string }>;
}

export default async function DataManagementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialTab = params.tab === "documents" ? "documents" : "upload";
  const initialDept = params.dept ?? "";

  return (
    <div className="space-y-6">
      {/* Compact page header */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold text-slate-950">Data management</h1>
        <span className="text-sm text-slate-500">
          Admin · Upload, organize, and manage your knowledge base
        </span>
      </div>

      <DataManagementTabs initialTab={initialTab} initialDept={initialDept} />
    </div>
  );
}
