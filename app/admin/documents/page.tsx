import { Card } from "flowbite-react";
import DocumentTable from "@/components/admin/DocumentTable";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <section className="page-hero">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          Documents
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">
          Review, filter, and retire knowledge assets.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Search documents, inspect metadata, and remove stale content without losing control of the overall library.
        </p>
      </section>
      <Card className="glass-panel rounded-[1.75rem] border-white/60">
        <DocumentTable />
      </Card>
    </div>
  );
}
