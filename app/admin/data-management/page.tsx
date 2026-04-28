import DataManagementTabs from "@/components/admin/DataManagementTabs";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DataManagementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialTab = params.tab === "documents" ? "documents" : "upload";

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          Data Management
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
          Upload, organize, and manage your knowledge base.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Add new documents or URLs for ingestion and review existing content
          across departments.
        </p>
      </section>

      <DataManagementTabs initialTab={initialTab} />
    </div>
  );
}
