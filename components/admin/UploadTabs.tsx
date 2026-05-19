"use client";

import { useState, useEffect, useRef } from "react";
import {
  Tabs,
  FileInput,
  Select,
  Button,
  Label,
  TextInput,
  Toast,
  Progress,
  Alert,
} from "flowbite-react";
import { HiUpload, HiLink, HiCheck, HiX } from "react-icons/hi";

interface Department {
  id: string;
  name: string;
}

interface UploadTabsProps {
  initialDept?: string;
}

export default function UploadTabs({ initialDept = "" }: UploadTabsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fileDept, setFileDept] = useState(initialDept);
  const [urlDept, setUrlDept] = useState(initialDept);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((d: Department[]) => setDepartments(d));
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !fileDept) return;

    setUploading(true);
    setProgress(30);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("departmentId", fileDept);

    try {
      setProgress(60);
      const res = await fetch("/api/admin/upload/file", {
        method: "POST",
        body: formData,
      });
      setProgress(100);

      if (res.ok) {
        showToast("success", "File uploaded. Processing in background...");
        if (fileRef.current) fileRef.current.value = "";
      } else {
        const err = await res.json() as { error?: string };
        showToast("error", err.error ?? "Upload failed");
      }
    } catch {
      showToast("error", "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleUrlUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !urlDept) return;

    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, departmentId: urlDept }),
      });

      if (res.ok) {
        showToast("success", "URL queued for processing...");
        setUrl("");
      } else {
        const err = await res.json() as { error?: string };
        showToast("error", err.error ?? "Failed to queue URL");
      }
    } catch {
      showToast("error", "Failed to queue URL");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="absolute right-0 top-0 z-50">
          <Toast>
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toast.type === "success"
                  ? "bg-green-100 text-green-500"
                  : "bg-red-100 text-red-500"
                }`}
            >
              {toast.type === "success" ? (
                <HiCheck className="h-5 w-5" />
              ) : (
                <HiX className="h-5 w-5" />
              )}
            </div>
            <div className="ml-3 text-sm font-normal">{toast.message}</div>
            <Toast.Toggle onDismiss={() => setToast(null)} />
          </Toast>
        </div>
      )}

      <Tabs variant="underline">
        <Tabs.Item title="Upload File" icon={HiUpload}>
          <form onSubmit={handleFileUpload} className="space-y-5 p-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Upload PDF, TXT, or Markdown files and assign them to a department for indexing.
            </div>
            <div>
              <Label htmlFor="file-upload">Select File (.pdf, .txt, .md)</Label>
              <FileInput
                id="file-upload"
                ref={fileRef}
                accept=".pdf,.txt,.md"
                required
                helperText="Max size: 50MB"
              />
            </div>
            <div>
              <Label htmlFor="file-dept">Department</Label>
              <Select
                id="file-dept"
                value={fileDept}
                onChange={(e) => setFileDept(e.target.value)}
                required
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            {uploading && progress > 0 && (
              <Progress progress={progress} color="blue" />
            )}
            <Button type="submit" disabled={uploading} color="blue">
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </form>
        </Tabs.Item>

        <Tabs.Item title="Upload via URL" icon={HiLink}>
          <form onSubmit={handleUrlUpload} className="space-y-5 p-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Queue a public or internal page URL to ingest its content in the background.
            </div>
            <div>
              <Label htmlFor="url-input">URL</Label>
              <TextInput
                id="url-input"
                type="url"
                placeholder="https://example.com/document"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="url-dept">Department</Label>
              <Select
                id="url-dept"
                value={urlDept}
                onChange={(e) => setUrlDept(e.target.value)}
                required
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={uploading} color="blue">
              {uploading ? "Queuing..." : "Queue URL"}
            </Button>
          </form>
        </Tabs.Item>
      </Tabs>
    </div>
  );
}
