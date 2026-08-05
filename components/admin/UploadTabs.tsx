"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminCardHeader } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAdminRateLimit } from "@/components/admin/AdminRateLimitContext";
import { readRateLimitNotice } from "@/lib/rate-limit-client";
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
  const { active: rateLimitActive, startRateLimit } = useAdminRateLimit();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queueDocs, setQueueDocs] = useState<QueueDocument[]>([]);
  const [activeTab, setActiveTab] = useState<SourceTab>("file");
  const [departmentId, setDepartmentId] = useState(initialDept);
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ResultState>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data: Department[]) => setDepartments(data));
  }, []);

  const loadQueue = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const hasProcessingDocument = queueDocs.some((doc) => doc.status === "processing");
    if (!hasProcessingDocument) return;

    const intervalId = window.setInterval(() => {
      loadQueue();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [loadQueue, queueDocs]);

  const canSubmit = useMemo(() => {
    if (!departmentId || uploading || rateLimitActive) return false;
    if (activeTab === "file") return !!selectedFile;
    return /^https?:\/\//i.test(url.trim());
  }, [activeTab, departmentId, rateLimitActive, selectedFile, uploading, url]);

  const clearInputs = () => {
    setUrl("");
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
    setResult({ kind: "idle" });
  };

  const handleFileDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setResult({ kind: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setUploading(true);
    setResult({ kind: "idle" });

    try {
      if (activeTab === "file") {
        const file = selectedFile;
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
          if (res.status === 429) {
            startRateLimit(await readRateLimitNotice(res));
            return;
          }
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
          if (res.status === 429) {
            startRateLimit(await readRateLimitNotice(res));
            return;
          }
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
    <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
        <AdminCard className="p-5">
          <div className="flex gap-5 border-b border-[var(--admin-border)] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium ${
                activeTab === "file" ? "border-[var(--admin-primary)] text-[var(--admin-primary)]" : "border-transparent text-[var(--admin-muted)] hover:text-[var(--admin-link)]"
              }`}
            >
              <HiUpload className="h-4 w-4" />
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium ${
                activeTab === "url" ? "border-[var(--admin-primary)] text-[var(--admin-primary)]" : "border-transparent text-[var(--admin-muted)] hover:text-[var(--admin-link)]"
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
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleFileDrop}
              className={`w-full rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
                isDraggingFile
                  ? "border-[var(--admin-primary)] bg-[var(--admin-soft)]"
                  : "border-[var(--admin-border)] bg-[var(--admin-background)] hover:border-[var(--admin-primary)] hover:bg-[var(--admin-soft)]"
              }`}
            >
              <div className="mx-auto flex w-fit items-center justify-center rounded-full bg-[var(--admin-lightprimary)] p-2 text-[var(--admin-primary)]">
                <HiUpload className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xl font-bold text-[var(--admin-heading)]">Drop files to ingest</p>
              <p className="text-sm text-[var(--admin-muted)]">or click to browse</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge>PDF</Badge>
                <Badge>TXT</Badge>
                <Badge>MD</Badge>
              </div>
              <p className="mt-3 text-xs text-[var(--admin-faint)]">Max size: 50MB</p>
            </button>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[var(--admin-border)] bg-[var(--admin-background)] p-6">
              <p className="text-sm font-semibold text-[var(--admin-heading)]">Paste page URL to ingest</p>
              <Input
                className="mt-3 rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] placeholder:text-[var(--admin-muted)]"
                placeholder="https://www.hestabit.com/policy"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setResult({ kind: "idle" });
                }}
              />
              <p className="mt-2 text-xs text-[var(--admin-muted)]">Use a publicly accessible or internal URL.</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={handleFileSelect}
          />

          {selectedFile && activeTab === "file" ? (
            <p className="text-sm text-[var(--admin-muted)]">
              Selected file: <span className="font-semibold text-[var(--admin-heading)]">{selectedFile.name}</span>
            </p>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-semibold text-[var(--admin-heading)]">Department</label>
            <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)]">
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
            className="rounded-xl bg-[var(--admin-primary)] text-white hover:bg-[var(--admin-primary-emphasis)]"
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
        </AdminCard>

        <AdminCard className="p-5">
        <AdminCardHeader
          title="Ingestion queue"
          subtitle={`${queueDocs.length} item${queueDocs.length === 1 ? "" : "s"} recently queued`}
        />
        <div className="mt-4 space-y-2">
          {queueDocs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--admin-border)] p-6 text-center text-sm text-[var(--admin-muted)]">
              No files in queue yet.
            </p>
          ) : (
            queueDocs.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-3">
                <div className="flex min-w-0 items-start gap-2">
                  <HiDocumentText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-primary)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--admin-heading)]">{doc.name}</p>
                    <p className="text-xs text-[var(--admin-muted)]">{doc.department.name} · {doc.type.toUpperCase()}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
              </div>
            ))
          )}
        </div>
        </AdminCard>
      </div>
    </>
  );
}
