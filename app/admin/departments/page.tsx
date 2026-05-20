"use client";

import { useEffect, useState, useCallback } from "react";
import DepartmentCard from "@/components/admin/DepartmentCard";

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
      <section className="admin-shell">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Departments</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Manage team ownership</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
          Keep team ownership clear so people can find and maintain the right sources quickly.
        </p>
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading teams...</div>
      ) : (
        <DepartmentCard departments={departments} onRefresh={fetchDepartments} />
      )}
    </div>
  );
}
