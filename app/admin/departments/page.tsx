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
      <section className="page-hero">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          Departments
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">
          Organize your knowledge by team and function.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Keep document ownership structured so admins and employees can find the right context faster.
        </p>
      </section>
      <DepartmentCard departments={departments} onRefresh={fetchDepartments} />
    </div>
  );
}
