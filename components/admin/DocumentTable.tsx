"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableFrame } from "@/components/admin/AdminUI";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HiEye, HiSearch, HiTrash } from "react-icons/hi";

interface Department {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  version: number;
  isLatest: boolean;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  department: Department;
  uploadedBy: { name: string | null; email: string };
  sourceUrl: string | null;
  filePath: string | null;
}

export default function DocumentTable() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedDept) params.set("department", selectedDept);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const res = await fetch(`/api/admin/documents?${params.toString()}`);
    const data = (await res.json()) as Document[];
    setDocuments(data);
    setLoading(false);
  }, [selectedDept, debouncedSearch]);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data: Department[]) => setDepartments(data));
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      setDeleteError("");
      fetchDocuments();
      return;
    }

    const err = (await res.json()) as { error?: string };
    setDeleteError(err.error ?? "Failed to delete document.");
  };

  const statusVariant = (status: string) => {
    if (status === "ready") return "success" as const;
    if (status === "failed") return "destructive" as const;
    return "warning" as const;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" aria-hidden="true" />
          <Input
            className="rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] pl-9 text-[var(--admin-link)] placeholder:text-[var(--admin-muted)]"
            placeholder="Search files by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="min-w-[220px] rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)]"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="">All teams</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </Select>
      </div>

      {deleteError ? <Alert variant="destructive">{deleteError}</Alert> : null}

      {loading ? (
        <div className="rounded-[7px] border border-[var(--admin-border)] p-10 text-center text-sm text-[var(--admin-muted)]">Loading files...</div>
      ) : documents.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-background)] p-10 text-center">
          <p className="text-lg font-bold text-[var(--admin-heading)]">No files found</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">Try a different search or department filter.</p>
        </div>
      ) : (
        <TableFrame>
          <Table>
            <TableHeader className="bg-[var(--admin-table-head-bg)]">
              <TableRow className="border-[var(--admin-border)]">
                <TableHead className="text-[var(--admin-table-head-text)]">Name</TableHead>
                <TableHead className="text-[var(--admin-table-head-text)]">Department</TableHead>
                <TableHead className="text-[var(--admin-table-head-text)]">Type</TableHead>
                <TableHead className="text-[var(--admin-table-head-text)]">Version</TableHead>
                <TableHead className="text-[var(--admin-table-head-text)]">Status</TableHead>
                <TableHead className="!text-[var(--admin-table-head-text)]">Added on</TableHead>
                <TableHead className="text-[var(--admin-table-head-text)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} className="border-[var(--admin-border)] hover:bg-[var(--admin-soft)]">
                  <TableCell className="max-w-[260px]">
                    <div className="truncate font-semibold text-[var(--admin-heading)]">{doc.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge>{doc.department.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--admin-muted)]">v{doc.version}</span>
                      {doc.isLatest ? <Badge variant="success">Latest</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap !text-[var(--admin-link)]">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] hover:border-[var(--admin-primary)] hover:!bg-[var(--admin-soft)] hover:text-[var(--admin-primary)] focus-visible:ring-[var(--admin-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-card)]"
                        onClick={() => setSelectedDoc(doc)}
                        aria-label={`View ${doc.name}`}
                      >
                        <HiEye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => setDeleteConfirm(doc.id)} aria-label={`Delete ${doc.name}`}>
                        <HiTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}

      <Dialog
        open={!!selectedDoc}
        onOpenChange={(open) => {
          if (!open) setSelectedDoc(null);
        }}
        title="File details"
      >
        {selectedDoc ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-[var(--admin-heading)]">Name</dt>
              <dd className="text-[var(--admin-muted)]">{selectedDoc.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--admin-heading)]">Department</dt>
              <dd className="text-[var(--admin-muted)]">{selectedDoc.department.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--admin-heading)]">Type</dt>
              <dd className="text-[var(--admin-muted)]">{selectedDoc.type}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--admin-heading)]">Status</dt>
              <dd className="text-[var(--admin-muted)]">{selectedDoc.status}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--admin-heading)]">Added by</dt>
              <dd className="text-[var(--admin-muted)]">{selectedDoc.uploadedBy.name ?? selectedDoc.uploadedBy.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--admin-heading)]">Added on</dt>
              <dd className="text-[var(--admin-muted)]">{new Date(selectedDoc.createdAt).toLocaleString()}</dd>
            </div>
            {selectedDoc.sourceUrl ? (
              <div>
                <dt className="font-semibold text-[var(--admin-heading)]">Source URL</dt>
                <dd className="break-all text-[var(--admin-muted)]">{selectedDoc.sourceUrl}</dd>
              </div>
            ) : null}
            {selectedDoc.filePath ? (
              <div>
                <dt className="font-semibold text-[var(--admin-heading)]">File path</dt>
                <dd className="break-all text-[var(--admin-muted)]">{selectedDoc.filePath}</dd>
              </div>
            ) : null}
            {selectedDoc.errorMessage ? (
              <Alert variant="destructive">{selectedDoc.errorMessage}</Alert>
            ) : null}
          </dl>
        ) : null}
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title="Delete file"
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) handleDelete(deleteConfirm);
              }}
            >
              Delete file
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--admin-muted)]">
          This will remove the file and its embeddings from search results. This action cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
