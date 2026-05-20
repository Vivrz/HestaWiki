"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPanel } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { HiCheckCircle, HiDocumentText, HiExclamationCircle, HiLink, HiUpload } from "react-icons/hi";

interface Department {
  id: string;
  name: string;
}

interface QueueDocument {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  status: string;
  department: { name: string };
}

interface UploadTabsProps {
  initialDept?: string;
}

type SourceTab = "file" | "url";

type ResultState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function UploadTabs({ initialDept = "" }: UploadTabsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queueDocs, setQueueDocs] = useState<QueueDocument[]>([]);
  const [activeTab, setActiveTab] = useState<SourceTab>("file");
  const [departmentId, setDepartmentId] = useState(initialDept);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ResultState>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data: Department[]) => setDepartments(data));
  }, []);

  const loadQueue = async () => {
    try {
      const res = await fetch("/api/admin/documents");
      const docs = (await res.json()) as QueueDocument[];
      const sorted = [...docs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 7);
      setQueueDocs(sorted);
    } catch {
      setQueueDocs([]);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const selectedFile = fileRef.current?.files?.[0] ?? null;
  const canSubmit = useMemo(() => {
    if (!departmentId || uploading) return false;
    if (activeTab === "file") return !!selectedFile;
    return /^https?:\/\//i.test(url.trim());
  }, [activeTab, departmentId, selectedFile, uploading, url]);

  const clearInputs = () => {
    setUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setUploading(true);
    setResult({ kind: "idle" });

    try {
      if (activeTab === "file") {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          setResult({ kind: "error", message: "Please choose a file first." });
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("departmentId", departmentId);

        const res = await fetch("/api/admin/upload/file", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setResult({ kind: "error", message: err.error ?? "Upload failed." });
        } else {
          setResult({ kind: "success", message: "File added to ingestion queue." });
          clearInputs();
          await loadQueue();
        }
      } else {
        const res = await fetch("/api/admin/upload/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), departmentId }),
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setResult({ kind: "error", message: err.error ?? "Could not queue URL." });
        } else {
          setResult({ kind: "success", message: "URL added to ingestion queue." });
          clearInputs();
          await loadQueue();
        }
      }
    } catch {
      setResult({ kind: "error", message: "Something went wrong. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const statusVariant = (status: string) => {
    if (status === "ready") return "success" as const;
    if (status === "failed") return "destructive" as const;
    return "warning" as const;
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
      <AdminPanel className="p-5">
          <div className="flex gap-5 border-b border-[var(--admin-panel-border)] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium ${
                activeTab === "file" ? "border-zinc-100 text-[var(--admin-text)]" : "border-transparent text-[var(--admin-text)]"
              }`}
            >
              <HiUpload className="h-4 w-4" />
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium ${
                activeTab === "url" ? "border-zinc-100 text-[var(--admin-text)]" : "border-transparent text-[var(--admin-text)]"
              }`}
            >
              <HiLink className="h-4 w-4" />
              Upload via URL
            </button>
          </div>

        <div className="mt-5 space-y-4">
          {activeTab === "file" ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] px-6 py-12 text-center"
            >
              <div className="mx-auto flex w-fit items-center justify-center rounded-full bg-[var(--admin-panel)] p-2 text-[var(--admin-text)]">
                <HiUpload className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xl font-semibold text-[var(--admin-text)]">Drop files to ingest</p>
              <p className="text-sm text-[var(--admin-text)]">or click to browse</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge>PDF</Badge>
                <Badge>TXT</Badge>
                <Badge>MD</Badge>
              </div>
              <p className="mt-3 text-xs text-[var(--admin-faint)]">Max size: 50MB</p>
            </button>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-6">
              <p className="text-sm font-medium text-[var(--admin-text)]">Paste page URL to ingest</p>
              <Input
                className="mt-3 border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)] placeholder:text-[var(--admin-text)]"
                placeholder="https://www.hestabit.com/policy"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setResult({ kind: "idle" });
                }}
              />
              <p className="mt-2 text-xs text-[var(--admin-text)]">Use a publicly accessible or internal URL.</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={() => setResult({ kind: "idle" })}
          />

          {selectedFile && activeTab === "file" ? (
            <p className="text-sm text-[var(--admin-text)]">
              Selected file: <span className="font-medium text-[var(--admin-text)]">{selectedFile.name}</span>
            </p>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-medium text-[var(--admin-text)]">Department</label>
            <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)]">
              <option value="">Select department...</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[var(--admin-button)] text-[var(--admin-button-text)] hover:bg-black"
          >
            {uploading ? "Submitting..." : "Begin ingestion"}
          </Button>

          {result.kind === "success" ? (
            <Alert variant="success" className="flex items-start gap-2">
              <HiCheckCircle className="mt-0.5 h-4 w-4" />
              <span>{result.message}</span>
            </Alert>
          ) : null}

          {result.kind === "error" ? (
            <Alert variant="destructive" className="flex items-start gap-2">
              <HiExclamationCircle className="mt-0.5 h-4 w-4" />
              <span>{result.message}</span>
            </Alert>
          ) : null}
        </div>
      </AdminPanel>

      <AdminPanel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Ingestion queue</h2>
            <p className="text-xs font-medium text-[var(--admin-text)]">{queueDocs.length} items</p>
          </div>
        <div className="mt-4 space-y-2">
          {queueDocs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--admin-panel-border)] p-6 text-center text-sm text-[var(--admin-text)]">
              No files in queue yet.
            </p>
          ) : (
            queueDocs.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 border-b border-[var(--admin-panel-border)] pb-3 last:border-b-0">
                <div className="flex min-w-0 items-start gap-2">
                  <HiDocumentText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-text)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--admin-text)]">{doc.name}</p>
                    <p className="text-xs text-[var(--admin-text)]">{doc.department.name} · {doc.type.toUpperCase()}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
              </div>
            ))
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
