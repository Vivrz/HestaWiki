"use client";

import { useEffect, useState, useCallback } from "react";
import DepartmentCard from "@/components/admin/DepartmentCard";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminUI";

interface Department {
  id: string;
  name: string;
  _count: { documents: number };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/departments");
    const data = (await res.json()) as Department[];
    setDepartments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Departments" subtitle="Keep team ownership clear so people can find and maintain the right sources quickly." />

      {loading ? (
        <AdminPanel className="p-10 text-center text-sm text-[var(--admin-text)]">Loading teams...</AdminPanel>
      ) : (
        <DepartmentCard departments={departments} onRefresh={fetchDepartments} />
      )}
    </div>
  );
}
