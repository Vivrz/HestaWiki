"use client";

import { useState } from "react";
import { HiOutlineDocumentText, HiOutlineUpload } from "react-icons/hi";
import UploadTabs from "@/components/admin/UploadTabs";
import DocumentTable from "@/components/admin/DocumentTable";
import { AdminPanel } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataManagementTabsProps {
  initialTab: "upload" | "documents";
  initialDept?: string;
}

const tabs = [
  { id: "upload" as const, label: "Add files", icon: HiOutlineUpload },
  { id: "documents" as const, label: "Review files", icon: HiOutlineDocumentText },
];

export default function DataManagementTabs({ initialTab, initialDept }: DataManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "documents">(initialTab);

  return (
    <AdminPanel className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap gap-2 border-b border-[var(--admin-panel-border)] pb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "secondary"}
            onClick={() => setActiveTab(id)}
            className={cn(
              activeTab === id
                ? "bg-[var(--admin-button)] text-[var(--admin-button-text)]"
                : "bg-[var(--admin-panel-soft)] text-[var(--admin-text)] hover:bg-[var(--admin-panel-soft)]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "upload" ? <UploadTabs initialDept={initialDept} /> : <DocumentTable />}
    </AdminPanel>
  );
}
