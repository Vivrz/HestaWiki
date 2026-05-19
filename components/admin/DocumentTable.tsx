"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search files by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="min-w-[220px]"
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
        <div className="rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading files...</div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No files found</p>
          <p className="mt-2 text-sm text-slate-500">Try a different search or team filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added on</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-slate-50">
                  <TableCell className="max-w-[260px]">
                    <div className="truncate font-medium text-slate-900">{doc.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge>{doc.department.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>v{doc.version}</span>
                      {doc.isLatest ? <Badge variant="success">Latest</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => setSelectedDoc(doc)} aria-label={`View ${doc.name}`}>
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
        </div>
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
              <dt className="font-medium text-slate-900">Name</dt>
              <dd className="text-slate-600">{selectedDoc.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Team</dt>
              <dd className="text-slate-600">{selectedDoc.department.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Type</dt>
              <dd className="text-slate-600">{selectedDoc.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Status</dt>
              <dd className="text-slate-600">{selectedDoc.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Added by</dt>
              <dd className="text-slate-600">{selectedDoc.uploadedBy.name ?? selectedDoc.uploadedBy.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Added on</dt>
              <dd className="text-slate-600">{new Date(selectedDoc.createdAt).toLocaleString()}</dd>
            </div>
            {selectedDoc.sourceUrl ? (
              <div>
                <dt className="font-medium text-slate-900">Source URL</dt>
                <dd className="break-all text-slate-600">{selectedDoc.sourceUrl}</dd>
              </div>
            ) : null}
            {selectedDoc.filePath ? (
              <div>
                <dt className="font-medium text-slate-900">File path</dt>
                <dd className="break-all text-slate-600">{selectedDoc.filePath}</dd>
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
        <p className="text-sm text-slate-600">
          This will remove the file and its embeddings from search results. This action cannot be undone.
        </p>
      </Dialog>
    </div>
  );
}
