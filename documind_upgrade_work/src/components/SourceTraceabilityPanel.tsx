import React, { useState } from "react";
import { Check, Clipboard, FileText, Search, ShieldCheck } from "lucide-react";
import { ChunkItem } from "../types";

interface SourceTraceabilityPanelProps {
  sources?: ChunkItem[];
  retrievalLatencyMs?: number;
  highlightedChunkId?: string | null;
  onSelectChunk?: (chunkId: string) => void;
}

export const SourceTraceabilityPanel: React.FC<SourceTraceabilityPanelProps> = ({
  sources = [],
  retrievalLatencyMs,
  highlightedChunkId,
  onSelectChunk,
}) => {
  const [filterText, setFilterText] = useState("");
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const filteredSources = sources.filter((s) => !filterText || `${s.text} ${s.source} ${s.chunk_id}`.toLowerCase().includes(filterText.toLowerCase()));

  const handleCopy = async (chunk: ChunkItem) => {
    await navigator.clipboard.writeText(chunk.text);
    setCopiedChunkId(chunk.chunk_id);
    window.setTimeout(() => setCopiedChunkId(null), 1600);
  };

  return (
    <div id="source-traceability-panel" className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">Sources</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Evidence used to ground the answer</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-600">{sources.length} retrieved</span>
        </div>
        {retrievalLatencyMs !== undefined && (
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">FAISS retrieval</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-mono font-medium text-emerald-700">{retrievalLatencyMs} ms</span>
          </div>
        )}
        {sources.length > 0 && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter sources…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[10px] outline-none focus:border-slate-300 focus:bg-white" />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sources.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileText className="h-5 w-5" /></div>
            <p className="mt-3 text-xs font-semibold text-slate-700">No sources yet</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">Run a question to see the exact document passages used in the response.</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="px-4 py-10 text-center text-[10px] text-slate-400">No matching passages.</div>
        ) : (
          <div className="space-y-2.5">
            {filteredSources.map((chunk, index) => {
              const relevance = chunk.relevance_percentage ?? 80;
              const highlighted = chunk.chunk_id === highlightedChunkId;
              return (
                <div key={chunk.chunk_id} id={`citation-card-${chunk.chunk_id}`} onClick={() => onSelectChunk?.(chunk.chunk_id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectChunk?.(chunk.chunk_id); }} className={`w-full rounded-2xl border p-3 text-left transition cursor-pointer ${highlighted ? "border-slate-900 bg-slate-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-[9px] font-semibold text-slate-600">{index + 1}</span>
                      <span className="truncate text-[10px] font-semibold text-slate-700">{chunk.source}</span>
                    </div>
                    <span className={`rounded-full px-2 py-1 font-mono text-[9px] font-semibold ${relevance >= 85 ? "bg-emerald-50 text-emerald-700" : relevance >= 70 ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700"}`}>{relevance}%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400">
                    <span>Page {chunk.page_number}</span><span>·</span><span>{chunk.token_count} tokens</span>
                    <button onClick={(e) => { e.stopPropagation(); void handleCopy(chunk); }} className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Copy passage">
                      {copiedChunkId === chunk.chunk_id ? <Check className="h-3 w-3 text-emerald-600" /> : <Clipboard className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-5 text-slate-600">{chunk.text}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] font-medium text-emerald-700"><ShieldCheck className="h-3 w-3" />Verified trace</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
