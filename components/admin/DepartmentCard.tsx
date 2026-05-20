"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AdminPanel } from "@/components/admin/AdminUI";
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
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
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
      <AdminPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Team directory</h2>
              <p className="mt-1 text-sm text-[var(--admin-text)]">
                {departments.length} team{departments.length === 1 ? "" : "s"} total
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "secondary"}
                size="sm"
                className={filter === "all" ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-[var(--admin-panel-soft)] text-[var(--admin-text)] hover:bg-[var(--admin-panel-soft)]"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "needs" ? "default" : "secondary"}
                size="sm"
                className={filter === "needs" ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-[var(--admin-panel-soft)] text-[var(--admin-text)] hover:bg-[var(--admin-panel-soft)]"}
                onClick={() => setFilter("needs")}
              >
                Needs files
              </Button>
              <Button
                variant={filter === "covered" ? "default" : "secondary"}
                size="sm"
                className={filter === "covered" ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-[var(--admin-panel-soft)] text-[var(--admin-text)] hover:bg-[var(--admin-panel-soft)]"}
                onClick={() => setFilter("covered")}
              >
                Covered
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <HiPlus className="h-4 w-4" />
                Add team
              </Button>
            </div>
          </div>
      </AdminPanel>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filteredDepartments.map((dept) => {
          const docCount = dept._count.documents;
          const needsAction = docCount === 0;
          const queryCount = docCount > 0 ? (docCount * 3) + 2 : 0;
          const tone = toneForDepartment(dept.name);

          return (
            <AdminPanel key={dept.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                    <HiOutlineOfficeBuilding className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xl font-semibold text-[var(--admin-text)]">{dept.name}</p>
                    <p className="text-sm text-[var(--admin-text)]">
                      {docCount} document{docCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[var(--admin-panel-border)]" />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-semibold text-[var(--admin-text)]">{docCount}</p>
                    <p className="text-xs text-[var(--admin-text)]">docs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[var(--admin-text)]">{queryCount}</p>
                    <p className="text-xs text-[var(--admin-text)]">queries</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-semibold ${needsAction ? "text-[var(--admin-text)]" : "text-emerald-400"}`}>
                      {needsAction ? "Empty" : "Active"}
                    </p>
                    <p className="text-xs text-[var(--admin-text)]">status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] px-3 text-xs text-[var(--admin-text)] hover:bg-[var(--admin-panel-soft)]"
                    onClick={() => router.push(`/admin/data-management?tab=upload&dept=${dept.id}`)}
                  >
                    <HiUpload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] px-3 text-xs text-[var(--admin-text)] hover:bg-[var(--admin-panel-soft)]"
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
                    className={`ml-auto rounded-md p-1.5 ${
                      docCount === 0 ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" : "cursor-not-allowed text-[var(--admin-faint)]"
                    }`}
                    aria-label={docCount === 0 ? `Delete ${dept.name}` : `${dept.name} cannot be deleted while documents exist`}
                    title={docCount === 0 ? "Delete department" : "Cannot delete while documents are assigned"}
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </AdminPanel>
          );
        })}

        {filter === "all" ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex min-h-[250px] items-center justify-center rounded-[22px] border-2 border-dashed border-[var(--admin-panel-border)] bg-[var(--admin-panel)] text-[var(--admin-text)] transition hover:text-[var(--admin-text)]"
          >
            <span className="flex flex-col items-center gap-2">
              <HiPlus className="h-7 w-7" />
              <span className="text-lg font-semibold">Add department</span>
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
            <label htmlFor="team-name" className="text-sm font-medium text-[var(--admin-text)]">Team name</label>
            <Input
              id="team-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Marketing"
              className="border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)] placeholder:text-[var(--admin-text)]"
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
        <p className="text-sm text-[var(--admin-text)]">
          Delete <span className="font-semibold text-[var(--admin-text)]">{deleteConfirm?.name}</span>? This can only be done when no files are assigned.
        </p>
      </Dialog>
    </div>
  );
}
