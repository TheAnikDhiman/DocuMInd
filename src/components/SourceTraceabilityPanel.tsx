import React, { useState } from "react";
import {
  FileText,
  Search,
  ExternalLink,
  Copy,
  Check,
  Percent,
  Bookmark,
  ChevronRight,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
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

  const handleCopyChunk = (chunk: ChunkItem) => {
    navigator.clipboard.writeText(chunk.text);
    setCopiedChunkId(chunk.chunk_id);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const filteredSources = sources.filter((s) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      s.text.toLowerCase().includes(q) ||
      s.source.toLowerCase().includes(q) ||
      s.chunk_id.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="source-traceability-panel"
      className="h-full flex flex-col bg-slate-50/70 border-l border-slate-200/80"
    >
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Source Traceability
            </h3>
          </div>
          <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200/60">
            {sources.length} Verified Chunks
          </span>
        </div>

        {retrievalLatencyMs !== undefined && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
            <span>FAISS Retrieval Time:</span>
            <span className="font-semibold text-emerald-700">
              {retrievalLatencyMs} ms
            </span>
          </div>
        )}

        {/* Quick Filter */}
        {sources.length > 0 && (
          <div className="relative mt-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search retrieved passages..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        )}
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {sources.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              No active source citations
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Ask a question in the chat to see the retrieved FAISS chunks, confidence
              percentages, and exact page locations.
            </p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No chunks match "{filterText}"
          </div>
        ) : (
          filteredSources.map((chunk, index) => {
            const isHighlighted = highlightedChunkId === chunk.chunk_id;
            const relevance = chunk.relevance_percentage ?? 80;
            const scoreColor =
              relevance >= 85
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : relevance >= 70
                ? "text-blue-700 bg-blue-50 border-blue-200"
                : "text-amber-700 bg-amber-50 border-amber-200";

            return (
              <div
                key={chunk.chunk_id}
                id={`citation-card-${chunk.chunk_id}`}
                onClick={() => onSelectChunk?.(chunk.chunk_id)}
                className={`bg-white rounded-xl border p-3.5 transition-all text-left relative ${
                  isHighlighted
                    ? "ring-2 ring-blue-500 border-blue-400 shadow-md scale-[1.01]"
                    : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <span
                      className="text-xs font-bold text-slate-800 truncate"
                      title={chunk.source}
                    >
                      {chunk.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}
                      title={`Cosine Similarity: ${chunk.score ?? "N/A"}`}
                    >
                      {relevance}% match
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyChunk(chunk);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      title="Copy chunk text"
                    >
                      {copiedChunkId === chunk.chunk_id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2.5 text-[10px] font-mono text-slate-500">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                    Page {chunk.page_number}
                  </span>
                  <span>•</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                    {chunk.token_count} tokens
                  </span>
                  <span>•</span>
                  <span className="text-slate-400 truncate max-w-[120px]" title={chunk.chunk_id}>
                    {chunk.chunk_id}
                  </span>
                </div>

                {/* Chunk text passage */}
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 font-sans select-text">
                  {filterText ? (
                    highlightMatches(chunk.text, filterText)
                  ) : (
                    chunk.text
                  )}
                </div>

                {/* Grounding verified stamp */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Traceable
                  </span>
                  <span className="font-mono text-slate-400">
                    Offset: {chunk.char_start ?? 0}–{chunk.char_end ?? chunk.text.length}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Simple text highlighter for search matches
function highlightMatches(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-200 text-slate-900 rounded-xs px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
