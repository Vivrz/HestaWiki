"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AdminCard, AdminCardHeader } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { HiEye, HiOutlineOfficeBuilding, HiPlus, HiTrash, HiUpload } from "react-icons/hi";

interface Department {
  id: string;
  name: string;
  _count: { documents: number };
}

interface DepartmentCardProps {
  departments: Department[];
  onRefresh: () => void;
}

type TeamFilter = "all" | "needs" | "covered";

const DEPARTMENT_TONES = [
  { badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", bar: "#8b5cf6" },
  { badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300", bar: "#0ea5e9" },
  { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", bar: "#10b981" },
  { badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", bar: "#f59e0b" },
  { badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", bar: "#f43f5e" },
] as const;

function toneForDepartment(name: string) {
  const seed = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEPARTMENT_TONES[seed % DEPARTMENT_TONES.length];
}

export default function DepartmentCard({ departments, onRefresh }: DepartmentCardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<TeamFilter>("all");
  const router = useRouter();

  const filteredDepartments = useMemo(() => {
    if (filter === "needs") return departments.filter((dept) => dept._count.documents === 0);
    if (filter === "covered") return departments.filter((dept) => dept._count.documents > 0);
    return departments;
  }, [departments, filter]);

  const maxDocs = Math.max(...departments.map((dept) => dept._count.documents), 0);
  const coverageFor = (docCount: number) =>
    maxDocs > 0 ? Math.min(100, Math.max(0, Math.round((docCount / maxDocs) * 100))) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Could not create team.");
        setLoading(false);
        return;
      }

      setShowAdd(false);
      setNewName("");
      onRefresh();
    } catch {
      setError("Could not create team.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Could not delete team.");
      }
      setDeleteConfirm(null);
      onRefresh();
    } catch {
      setError("Could not delete team.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AdminCardHeader
              title="Department directory"
              subtitle={`${departments.length} department${departments.length === 1 ? "" : "s"} total`}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "secondary"}
                size="sm"
                className={filter === "all" ? "bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-emphasis)]" : "bg-[var(--admin-background)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "needs" ? "default" : "secondary"}
                size="sm"
                className={filter === "needs" ? "bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-emphasis)]" : "bg-[var(--admin-background)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"}
                onClick={() => setFilter("needs")}
              >
                Needs files
              </Button>
              <Button
                variant={filter === "covered" ? "default" : "secondary"}
                size="sm"
                className={filter === "covered" ? "bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-emphasis)]" : "bg-[var(--admin-background)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"}
                onClick={() => setFilter("covered")}
              >
                Covered
              </Button>
              <Button size="sm" className="bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-emphasis)]" onClick={() => setShowAdd(true)}>
                <HiPlus className="h-4 w-4" />
                Add team
              </Button>
            </div>
          </div>
      </AdminCard>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filteredDepartments.map((dept) => {
          const docCount = dept._count.documents;
          const needsAction = docCount === 0;
          const queryCount = docCount > 0 ? (docCount * 3) + 2 : 0;
          const tone = toneForDepartment(dept.name);
          const coverage = coverageFor(docCount);

          return (
            <AdminCard key={dept.id} className="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
                    <HiOutlineOfficeBuilding className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-[var(--admin-heading)]">{dept.name}</p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {docCount} document{docCount === 1 ? "" : "s"} indexed
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      needsAction
                        ? "bg-[var(--admin-lightwarning)] text-[var(--admin-warning)]"
                        : "bg-[var(--admin-lightsuccess)] text-[var(--admin-success)]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${needsAction ? "bg-[var(--admin-warning)]" : "bg-[var(--admin-success)]"}`} />
                    {needsAction ? "Empty" : "Active"}
                  </span>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--admin-muted)]">Coverage</span>
                    <span className="font-bold" style={{ color: tone.bar }}>{coverage}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-background)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${coverage}%`, background: tone.bar }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-[var(--admin-border)] overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] py-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-[var(--admin-heading)]">{docCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--admin-muted)]">docs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--admin-heading)]">{queryCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--admin-muted)]">queries</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: tone.bar }}>{coverage}%</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--admin-muted)]">coverage</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-xs text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"
                    onClick={() => router.push(`/admin/data-management?tab=upload&dept=${dept.id}`)}
                  >
                    <HiUpload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-xs text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"
                    onClick={() => router.push(`/admin/data-management?tab=documents&dept=${dept.id}`)}
                  >
                    <HiEye className="h-3.5 w-3.5" />
                    View docs
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      if (docCount === 0) setDeleteConfirm(dept);
                    }}
                    className={`ml-auto rounded-lg p-2 ${
                      docCount === 0 ? "text-rose-500 hover:bg-rose-500/10 hover:text-rose-600" : "cursor-not-allowed text-[var(--admin-faint)]"
                    }`}
                    aria-label={docCount === 0 ? `Delete ${dept.name}` : `${dept.name} cannot be deleted while documents exist`}
                    title={docCount === 0 ? "Delete department" : "Cannot delete while documents are assigned"}
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </AdminCard>
          );
        })}

        {filter === "all" ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex min-h-[250px] items-center justify-center rounded-xl border-2 border-dashed border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-muted)] transition hover:border-[var(--admin-primary)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-primary)]"
          >
            <span className="flex flex-col items-center gap-2">
              <HiPlus className="h-7 w-7" />
              <span className="text-lg font-bold">Add department</span>
            </span>
          </button>
        ) : null}
      </div>

      <Dialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add team"
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="team-name" className="text-sm font-semibold text-[var(--admin-heading)]">Department name</label>
            <Input
              id="team-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Marketing"
              className="rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] placeholder:text-[var(--admin-muted)]"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create team"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title="Delete team"
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (deleteConfirm) handleDelete(deleteConfirm.id);
              }}
            >
              {deleting ? "Deleting..." : "Delete team"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--admin-muted)]">
          Delete <span className="font-semibold text-[var(--admin-heading)]">{deleteConfirm?.name}</span>? This can only be done when no files are assigned.
        </p>
      </Dialog>
    </div>
  );
}
