import DataManagementTabs from "@/components/admin/DataManagementTabs";
import { AdminPageHeader } from "@/components/admin/AdminUI";

interface PageProps {
  searchParams: Promise<{ tab?: string; dept?: string }>;
}

export default async function DataManagementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialTab = params.tab === "documents" ? "documents" : "upload";
  const initialDept = params.dept ?? "";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Data Management"
        subtitle="Upload files or links, assign them to teams, and track whether they are ready for chat answers."
        actionLabel="Manage departments"
        actionHref="/admin/departments"
      />

      <DataManagementTabs initialTab={initialTab} initialDept={initialDept} />
    </div>
  );
}
