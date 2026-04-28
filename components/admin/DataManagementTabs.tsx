"use client";

import { useState } from "react";
import { Card } from "flowbite-react";
import { HiOutlineUpload, HiOutlineDocumentText } from "react-icons/hi";
import UploadTabs from "@/components/admin/UploadTabs";
import DocumentTable from "@/components/admin/DocumentTable";

interface DataManagementTabsProps {
  initialTab: "upload" | "documents";
}

const tabs = [
  { id: "upload" as const, label: "Upload Documents", icon: HiOutlineUpload },
  { id: "documents" as const, label: "Manage Documents", icon: HiOutlineDocumentText },
];

export default function DataManagementTabs({ initialTab }: DataManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "documents">(initialTab);

  return (
    <div className="space-y-4">
      {/* Custom pill tabs */}
      <div className="flex gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card className="glass-panel rounded-[1.75rem] border-white/60">
        {activeTab === "upload" ? <UploadTabs /> : <DocumentTable />}
      </Card>
    </div>
  );
}
