"use client";

import { useState } from "react";
import { HiOutlineDocumentText, HiChevronDown } from "react-icons/hi";

interface Source {
  docId: string;
  docName: string;
  department: string;
  version: number;
  chunkIndex: number;
}

interface SourceAccordionProps {
  sources: Source[];
}

export default function SourceAccordion({ sources }: SourceAccordionProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  const uniqueSources = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.docId === s.docId) === i
  );

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
        style={{
          background: "var(--input-bg)",
          borderColor: "var(--border-color)",
          color: "var(--text-secondary)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
      >
        <HiOutlineDocumentText className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
        {uniqueSources.length} source{uniqueSources.length > 1 ? "s" : ""}
        <HiChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="mt-2 overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border-color)" }}
        >
          <ul className="divide-y" style={{ background: "var(--input-bg)" }}>
            {uniqueSources.map((source) => (
              <li
                key={source.docId}
                className="flex items-center gap-3 px-3.5 py-2.5"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                  style={{ background: "var(--hover-bg)", color: "var(--accent)" }}
                >
                  {source.department.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {source.docName}
                  </span>
                  <span className="block text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {source.department} · v{source.version}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
