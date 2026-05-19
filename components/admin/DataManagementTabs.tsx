"use client";

import { useState } from "react";
import { HiOutlineUpload, HiOutlineDocumentText } from "react-icons/hi";
import UploadTabs from "@/components/admin/UploadTabs";
import DocumentTable from "@/components/admin/DocumentTable";

interface DataManagementTabsProps {
  initialTab: "upload" | "documents";
  initialDept?: string;
}

const tabs = [
  { id: "upload" as const, label: "Upload documents", icon: HiOutlineUpload },
  { id: "documents" as const, label: "Manage documents", icon: HiOutlineDocumentText },
];

export default function DataManagementTabs({ initialTab, initialDept }: DataManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "documents">(initialTab);

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === id
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "upload" ? (
        <UploadTabs initialDept={initialDept} />
      ) : (
        <DocumentTable />
      )}
    </div>
  );
}
