import { Card } from "flowbite-react";
import UploadTabs from "@/components/admin/UploadTabs";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <section className="page-hero">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          Uploads
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">
          Bring new company knowledge into the system.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Add files or queue URLs for ingestion, then map them to the right department so retrieval stays precise.
        </p>
      </section>
      <Card className="glass-panel rounded-[1.75rem] border-white/60">
        <UploadTabs />
      </Card>
    </div>
  );
}
