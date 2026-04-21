"use client";

import { Accordion, Badge } from "flowbite-react";

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
  if (!sources || sources.length === 0) return null;

  const uniqueSources = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.docId === s.docId) === i
  );

  return (
    <div className="mt-3">
      <Accordion collapseAll>
        <Accordion.Panel>
          <Accordion.Title className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
            Sources ({uniqueSources.length})
          </Accordion.Title>
          <Accordion.Content className="p-3">
            <ul className="space-y-1">
              {uniqueSources.map((source) => (
                <li
                  key={source.docId}
                  className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"
                >
                  <Badge color="gray" className="shrink-0">
                    {source.department}
                  </Badge>
                  <span className="truncate">{source.docName}</span>
                  <Badge color="blue" className="shrink-0">
                    v{source.version}
                  </Badge>
                </li>
              ))}
            </ul>
          </Accordion.Content>
        </Accordion.Panel>
      </Accordion>
    </div>
  );
}
