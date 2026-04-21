"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  Select,
  TextInput,
  Button,
  Modal,
  Alert,
  Spinner,
} from "flowbite-react";
import { HiSearch, HiTrash, HiEye } from "react-icons/hi";

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

const STATUS_COLORS: Record<string, "success" | "warning" | "failure" | "gray"> = {
  ready: "success",
  processing: "warning",
  failed: "failure",
};

const TYPE_COLORS: Record<string, "blue" | "purple" | "green" | "indigo"> = {
  pdf: "blue",
  text: "purple",
  md: "green",
  url: "indigo",
};

const centeredBlurModalTheme = {
  root: {
    show: {
      on: "flex bg-slate-950/30 backdrop-blur-md",
      off: "hidden",
    },
  },
  content: {
    base: "relative h-full w-full max-w-3xl p-4 md:h-auto",
    inner:
      "relative flex max-h-[88dvh] flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-[0_30px_100px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl",
  },
  header: {
    base: "flex items-start justify-between border-b border-slate-200 px-6 py-4",
    popup: "border-b-0 p-2",
    title: "text-xl font-semibold text-slate-950",
    close: {
      base: "ml-auto inline-flex items-center rounded-xl bg-transparent p-2 text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-900",
      icon: "h-5 w-5",
    },
  },
  body: {
    base: "flex-1 overflow-auto px-6 py-5",
    popup: "pt-0",
  },
};

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
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedDept) params.set("department", selectedDept);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const res = await fetch(`/api/admin/documents?${params}`);
    const data = await res.json() as Document[];
    setDocuments(data);
    setLoading(false);
  }, [selectedDept, debouncedSearch]);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((d: Department[]) => setDepartments(d));
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchDocuments();
    } else {
      setDeleteError("Failed to delete document");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <TextInput
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          className="min-w-[220px]"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      {deleteError && (
        <Alert color="failure" onDismiss={() => setDeleteError("")}>
          {deleteError}
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No documents found</p>
          <p className="mt-2 text-sm text-slate-500">
            Try broadening your search or choose a different department filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Name
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Department
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Type
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Version
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Uploaded At
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="cursor-pointer bg-white transition hover:bg-slate-50/80"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <td className="max-w-xs px-6 py-4 font-medium text-slate-900">
                    <div className="truncate">{doc.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color="gray">{doc.department.name}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={TYPE_COLORS[doc.type] ?? "gray"}>
                      {doc.type.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="mr-1">v{doc.version}</span>
                    {doc.isLatest && (
                      <Badge color="success" className="inline">
                        Latest
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={STATUS_COLORS[doc.status] ?? "gray"}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="xs"
                        color="gray"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <HiEye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="xs"
                        color="failure"
                        onClick={() => setDeleteConfirm(doc.id)}
                      >
                        <HiTrash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        show={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        position="center"
        size="3xl"
        theme={centeredBlurModalTheme}
      >
        <Modal.Header>Document Details</Modal.Header>
        <Modal.Body>
          {selectedDoc && (
            <dl className="space-y-3">
              {[
                ["Name", selectedDoc.name],
                ["Department", selectedDoc.department.name],
                ["Type", selectedDoc.type],
                ["Version", `v${selectedDoc.version}${selectedDoc.isLatest ? " (Latest)" : ""}`],
                ["Status", selectedDoc.status],
                ["Uploaded By", selectedDoc.uploadedBy.email],
                ["Uploaded At", new Date(selectedDoc.createdAt).toLocaleString()],
                ...(selectedDoc.sourceUrl ? [["Source URL", selectedDoc.sourceUrl]] : []),
                ...(selectedDoc.filePath ? [["File Path", selectedDoc.filePath]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm font-medium text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">{value}</dd>
                </div>
              ))}
              {selectedDoc.errorMessage && (
                <Alert color="failure">
                  <p className="font-medium">Error</p>
                  <p>{selectedDoc.errorMessage}</p>
                </Alert>
              )}
            </dl>
          )}
        </Modal.Body>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} size="sm">
        <Modal.Header className="px-3 py-2">Confirm Delete</Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this document and all its embeddings?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="dark"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Delete
          </Button>
          <Button color="gray" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
