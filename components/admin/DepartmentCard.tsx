"use client";

import { useState } from "react";
import { Card, Badge, Button, Modal, TextInput, Label, Alert } from "flowbite-react";
import { HiOfficeBuilding, HiPlus } from "react-icons/hi";

interface Department {
  id: string;
  name: string;
  _count: { documents: number };
}

interface DepartmentCardProps {
  departments: Department[];
  onRefresh: () => void;
}

export default function DepartmentCard({
  departments,
  onRefresh,
}: DepartmentCardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setShowAdd(false);
        setNewName("");
        onRefresh();
      } else {
        const err = await res.json() as { error?: string };
        setError(err.error ?? "Failed to create department");
      }
    } catch {
      setError("Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-950">Department directory</h2>
        <Button color="blue" onClick={() => setShowAdd(true)}>
          <HiPlus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card
            key={dept.id}
            className="glass-panel rounded-[1.5rem] border-white/60 transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-32px_rgba(14,165,233,0.45)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                  <HiOfficeBuilding className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{dept.name}</p>
                  <p className="text-sm text-slate-500">
                    {dept._count.documents} document
                    {dept._count.documents !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Badge color="info">{dept._count.documents}</Badge>
            </div>
            {dept._count.documents > 0 && (
              <Alert color="warning" className="mt-4 text-xs">
                Cannot delete while documents are assigned.
              </Alert>
            )}
          </Card>
        ))}
      </div>

      <Modal show={showAdd} onClose={() => setShowAdd(false)} size="sm">
        <Modal.Header className="px-3 py-2">Add Department</Modal.Header>
        <Modal.Body>
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <Alert color="failure">{error}</Alert>}
            <div>
              <Label htmlFor="dept-name">Department Name</Label>
              <TextInput
                id="dept-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Marketing"
                required
              />
            </div>
            <Button type="submit" color="blue" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
