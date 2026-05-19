"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { HiOutlineOfficeBuilding, HiPlus, HiTrash } from "react-icons/hi";

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredDepartments.map((dept) => {
          const docCount = dept._count.documents;
          const needsAction = docCount === 0;

          return (
            <Card key={dept.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <HiOutlineOfficeBuilding className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-xl">{dept.name}</CardTitle>
                      <CardDescription>
                        {docCount} file{docCount === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={needsAction ? "warning" : "success"}>
                    {needsAction ? "Needs files" : "Covered"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {needsAction ? (
                  <p className="text-sm text-amber-700">No source files assigned yet. Add at least one file for this team.</p>
                ) : (
                  <p className="text-sm text-slate-600">This team has content assigned and ready for maintenance workflows.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/data-management?tab=documents&dept=${dept.id}`)}
                  >
                    View files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/data-management?tab=upload&dept=${dept.id}`)}
                  >
                    Add files
                  </Button>
                  <Button variant="secondary" size="sm" disabled title="Owner assignment requires role/team mapping API">
                    Assign owner
                  </Button>
                  {docCount === 0 ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirm(dept)}
                      aria-label={`Delete ${dept.name}`}
                    >
                      <HiTrash className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled title="Move or remove files before deleting this team">
                      Delete blocked
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
