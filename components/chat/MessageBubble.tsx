import SourceAccordion from "./SourceAccordion";

interface Source {
  docId: string;
  docName: string;
  department: string;
  version: number;
  chunkIndex: number;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function MessageBubble({
  role,
  content,
  sources,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`mb-5 flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-xs font-bold text-white shadow-lg">
          AI
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-[1.5rem] px-4 py-3 text-sm leading-7 shadow-sm ${
            isUser
              ? "rounded-tr-md bg-[#ecf2fd] text-black"
              : "rounded-tl-md border border-white/60 bg-white/85 text-slate-900"
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {!isUser && sources && sources.length > 0 && (
          <SourceAccordion sources={sources} />
        )}
      </div>
      {isUser && (
        <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-xs font-bold text-slate-700">
          user
        </div>
      )}
    </div>
  );
}
