"use client";

import { useState } from "react";
import { Modal, TextInput, Label, Alert, Spinner } from "flowbite-react";
import {
  HiPlus,
  HiUpload,
  HiEye,
  HiTrash,
} from "react-icons/hi";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  _count: { documents: number };
}

interface DepartmentCardProps {
  departments: Department[];
  onRefresh: () => void;
}

/* Deterministic color palette per department name */
const DEPT_COLORS: Record<string, { bg: string; text: string; ring: string; icon: string }> = {
  HR: { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200", icon: "📋" },
  Legal: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200", icon: "⚖️" },
  Engineering: { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200", icon: "💻" },
  Finance: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200", icon: "📊" },
  Operations: { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200", icon: "⚙️" },
  Marketing: { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-200", icon: "📣" },
  Sales: { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200", icon: "💼" },
};

const FALLBACK_COLORS = [
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200", icon: "🏢" },
  { bg: "bg-cyan-100", text: "text-cyan-700", ring: "ring-cyan-200", icon: "🏢" },
  { bg: "bg-pink-100", text: "text-pink-700", ring: "ring-pink-200", icon: "🏢" },
];

function getDeptColor(name: string) {
  if (DEPT_COLORS[name]) return DEPT_COLORS[name];
  // Hash-based fallback
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export default function DepartmentCard({
  departments,
  onRefresh,
}: DepartmentCardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

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

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirm(null);
        onRefresh();
      } else {
        const err = await res.json() as { error?: string };
        setError(err.error ?? "Failed to delete department");
        setDeleteConfirm(null);
      }
    } catch {
      setError("Failed to delete department");
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Directory header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Department directory
        </h2>
        <span className="text-sm text-slate-500">
          {departments.length} department{departments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <Alert color="failure" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Department grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const color = getDeptColor(dept.name);
          const docCount = dept._count.documents;
          const status = docCount > 0 ? "Active" : "Empty";

          return (
            <div
              key={dept.id}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Header: Icon + Name */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.bg} ${color.text} ring-1 ${color.ring}`}
                >
                  <span className="text-base">{color.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{dept.name}</p>
                  <p className="text-xs text-slate-500">
                    {docCount} document{docCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 flex items-center gap-5 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">{docCount}</p>
                  <p className="text-xs text-slate-500">docs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">0</p>
                  <p className="text-xs text-slate-500">queries</p>
                </div>
                <div className="ml-auto">
                  <span
                    className={`text-sm font-medium ${
                      status === "Active" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {status}
                  </span>
                  <p className="text-xs text-slate-500">status</p>
                </div>
              </div>

              {/* Actions row */}
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/data-management?tab=upload&dept=${dept.id}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-sky-700"
                >
                  <HiUpload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/data-management?tab=documents&dept=${dept.id}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-sky-700"
                >
                  <HiEye className="h-3.5 w-3.5" />
                  View docs
                </button>
                <div className="ml-auto">
                  {docCount === 0 ? (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(dept.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Delete department"
                    >
                      <HiTrash className="h-4 w-4" />
                    </button>
                  ) : (
                    <span
                      className="cursor-not-allowed rounded-lg p-1.5 text-slate-300"
                      title="Cannot delete — documents assigned"
                    >
                      <HiTrash className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add department card */}
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-8 text-slate-400 transition-all hover:border-sky-400 hover:bg-sky-50/30 hover:text-sky-600"
        >
          <HiPlus className="mb-2 h-7 w-7" />
          <span className="text-sm font-medium">Add department</span>
        </button>
      </div>

      {/* Add department modal */}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        show={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        size="sm"
      >
        <Modal.Header className="px-3 py-2">Confirm Delete</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this department? This action cannot
            be undone.
          </p>
        </Modal.Body>
        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() =>
              deleteConfirm && handleDelete(deleteConfirm)
            }
            disabled={deleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Deleting...
              </span>
            ) : (
              "Delete"
            )}
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(null)}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
