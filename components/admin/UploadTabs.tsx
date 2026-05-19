"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { HiCheckCircle, HiExclamationCircle, HiLink, HiUpload } from "react-icons/hi";

interface Department {
  id: string;
  name: string;
}

interface UploadTabsProps {
  initialDept?: string;
}

type SourceType = "file" | "url";
type Step = 1 | 2 | 3;

type ResultState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function UploadTabs({ initialDept = "" }: UploadTabsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>("file");
  const [step, setStep] = useState<Step>(1);
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

  const selectedFile = fileRef.current?.files?.[0] ?? null;

  const stepOneComplete = useMemo(() => {
    if (sourceType === "file") return !!selectedFile;
    return /^https?:\/\//i.test(url.trim());
  }, [sourceType, selectedFile, url]);

  const stepTwoComplete = Boolean(departmentId);
  const canSubmit = stepOneComplete && stepTwoComplete && !uploading;

  const resetForm = () => {
    setUrl("");
    setStep(1);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setUploading(true);
    setResult({ kind: "idle" });

    try {
      if (sourceType === "file") {
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
          setResult({
            kind: "success",
            message: "File uploaded and queued for processing. You can review status in Review files.",
          });
          resetForm();
        }
      } else {
        const res = await fetch("/api/admin/upload/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), departmentId }),
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setResult({ kind: "error", message: err.error ?? "Could not queue this URL." });
        } else {
          setResult({
            kind: "success",
            message: "Link added and queued for processing. You can review status in Review files.",
          });
          resetForm();
        }
      }
    } catch {
      setResult({ kind: "error", message: "Something went wrong. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((stepNumber) => (
          <button
            key={stepNumber}
            type="button"
            onClick={() => {
              if (stepNumber === 1) setStep(1);
              if (stepNumber === 2 && stepOneComplete) setStep(2);
              if (stepNumber === 3 && stepOneComplete && stepTwoComplete) setStep(3);
            }}
            className={`rounded-xl border p-4 text-left transition ${
              step === stepNumber
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Step {stepNumber}</p>
            <p className="mt-1 text-sm font-medium">
              {stepNumber === 1 ? "Choose source" : stepNumber === 2 ? "Assign team" : "Review and confirm"}
            </p>
          </button>
        ))}
      </div>

      {result.kind === "success" ? (
        <Alert variant="success" className="flex items-start gap-2">
          <HiCheckCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <span>{result.message}</span>
        </Alert>
      ) : null}
      {result.kind === "error" ? (
        <Alert variant="destructive" className="flex items-start gap-2">
          <HiExclamationCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <span>{result.message}</span>
        </Alert>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Choose your source</CardTitle>
            <CardDescription>Select a file from your computer or paste a link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={sourceType === "file" ? "default" : "secondary"} onClick={() => setSourceType("file")}>
                <HiUpload className="h-4 w-4" aria-hidden="true" />
                Upload file
              </Button>
              <Button variant={sourceType === "url" ? "default" : "secondary"} onClick={() => setSourceType("url")}>
                <HiLink className="h-4 w-4" aria-hidden="true" />
                Paste link
              </Button>
            </div>

            {sourceType === "file" ? (
              <div className="space-y-2">
                <label htmlFor="source-file" className="text-sm font-medium text-slate-700">
                  Select file (.pdf, .txt, .md)
                </label>
                <input
                  id="source-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={() => setResult({ kind: "idle" })}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                />
                <p className="text-xs text-slate-500">Maximum size: 50MB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="source-url" className="text-sm font-medium text-slate-700">Paste URL</label>
                <Input
                  id="source-url"
                  type="url"
                  placeholder="https://example.com/policy"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setResult({ kind: "idle" });
                  }}
                />
                <p className="text-xs text-slate-500">Use a public or internal page URL.</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button disabled={!stepOneComplete} onClick={() => setStep(2)}>
                Continue to team
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Assign a team</CardTitle>
            <CardDescription>Pick who should own and maintain this source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium text-slate-700">Team</label>
              <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select team...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!stepTwoComplete} onClick={() => setStep(3)}>Continue to review</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review and confirm</CardTitle>
            <CardDescription>Check details before submitting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">Source type: <Badge variant="secondary">{sourceType === "file" ? "File" : "Link"}</Badge></p>
              <p className="mt-2 break-all text-sm text-slate-700">
                Source: {sourceType === "file" ? selectedFile?.name ?? "No file selected" : url || "No URL entered"}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Team: {departments.find((d) => d.id === departmentId)?.name ?? "Not selected"}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              After you submit, processing happens in the background. Use Review files to track status.
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {uploading ? "Submitting..." : "Submit source"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
