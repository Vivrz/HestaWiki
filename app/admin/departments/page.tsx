"use client";

import { useEffect, useState, useCallback } from "react";
import { Spinner } from "flowbite-react";
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
    const data = await res.json() as Department[];
    setDepartments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact page header */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold text-slate-950">Departments</h1>
        <span className="text-sm text-slate-500">
          Admin · Organize your knowledge by team and function
        </span>
      </div>

      <DepartmentCard departments={departments} onRefresh={fetchDepartments} />
    </div>
  );
}
