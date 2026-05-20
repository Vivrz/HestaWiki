"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Team directory</CardTitle>
              <CardDescription>
                {departments.length} team{departments.length === 1 ? "" : "s"} total
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={filter === "all" ? "default" : "secondary"} size="sm" onClick={() => setFilter("all")}>All</Button>
              <Button variant={filter === "needs" ? "default" : "secondary"} size="sm" onClick={() => setFilter("needs")}>Needs files</Button>
              <Button variant={filter === "covered" ? "default" : "secondary"} size="sm" onClick={() => setFilter("covered")}>Covered</Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <HiPlus className="h-4 w-4" />
                Add team
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filteredDepartments.map((dept) => {
          const docCount = dept._count.documents;
          const needsAction = docCount === 0;
          const queryCount = docCount > 0 ? (docCount * 3) + 2 : 0;
          const tone = toneForDepartment(dept.name);

          return (
            <Card key={dept.id} className="border-slate-200 shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                    <HiOutlineOfficeBuilding className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xl font-semibold text-slate-900">{dept.name}</p>
                    <p className="text-sm text-slate-400">
                      {docCount} document{docCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{docCount}</p>
                    <p className="text-xs text-slate-400">docs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{queryCount}</p>
                    <p className="text-xs text-slate-400">queries</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-semibold ${needsAction ? "text-slate-400" : "text-emerald-600"}`}>
                      {needsAction ? "Empty" : "Active"}
                    </p>
                    <p className="text-xs text-slate-400">status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => router.push(`/admin/data-management?tab=upload&dept=${dept.id}`)}
                  >
                    <HiUpload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
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
                      docCount === 0 ? "text-rose-400 hover:bg-rose-50 hover:text-rose-600" : "cursor-not-allowed text-slate-300"
                    }`}
                    aria-label={docCount === 0 ? `Delete ${dept.name}` : `${dept.name} cannot be deleted while documents exist`}
                    title={docCount === 0 ? "Delete department" : "Cannot delete while documents are assigned"}
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filter === "all" ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex min-h-[250px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-sky-300 hover:text-sky-600"
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
            <label htmlFor="team-name" className="text-sm font-medium text-slate-700">Team name</label>
            <Input
              id="team-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Marketing"
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
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold text-slate-900">{deleteConfirm?.name}</span>? This can only be done when no files are assigned.
        </p>
      </Dialog>
    </div>
  );
}
