import React, { useEffect, useState } from "react";
import { Check, Clipboard, Database, FileText, Hash, Search, SlidersHorizontal } from "lucide-react";
import { ChunkItem, DocumentItem } from "../types";

interface ChunkInspectorProps {
  documents: DocumentItem[];
  selectedDocumentFilter?: string;
}

export const ChunkInspector: React.FC<ChunkInspectorProps> = ({ documents, selectedDocumentFilter = "" }) => {
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState(selectedDocumentFilter);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDocumentFilter) setSourceFilter(selectedDocumentFilter);
  }, [selectedDocumentFilter]);

  useEffect(() => {
    const fetchChunks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (sourceFilter) params.append("source", sourceFilter);
        if (searchTerm) params.append("search", searchTerm);
        params.append("limit", "100");
        const res = await fetch(`/api/chunks?${params.toString()}`);
        const data = await res.json();
        setChunks(data.chunks || []);
        setTotalChunks(data.total || 0);
      } catch (err) {
        console.error("Failed to fetch chunks:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchChunks();
  }, [sourceFilter, searchTerm]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div id="chunk-inspector" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Retrieval internals</p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-950"><Database className="h-5 w-5 text-slate-500" />Vector index</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Inspect the chunks that power semantic retrieval, including source, page, token count, and index position.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-[9px] uppercase tracking-wide text-slate-400">Matching chunks</div>
          <div className="mt-1 text-xl font-semibold font-mono text-slate-900">{totalChunks}</div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="input-chunk-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search chunk text or ID…" className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-slate-200 focus:bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="ml-2 h-3.5 w-3.5 text-slate-400" />
            <select id="select-document-filter" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="min-w-52 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-slate-300">
              <option value="">All documents</option>
              {documents.map((d) => <option key={d.id} value={d.filename}>{d.filename} ({d.chunk_count})</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : chunks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Database className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-xs font-semibold text-slate-600">No chunks match this filter</p>
          <p className="mt-1 text-[10px] text-slate-400">Try clearing the search or selecting another document.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {chunks.map((chunk) => (
            <article key={chunk.chunk_id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate font-mono text-[10px] font-semibold text-slate-700">{chunk.chunk_id}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-600"><FileText className="h-3 w-3" />{chunk.source}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[9px] text-slate-600">p.{chunk.page_number}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[9px] text-slate-600">{chunk.token_count} tokens</span>
                  </div>
                </div>
                <button onClick={() => void handleCopy(chunk.text, chunk.chunk_id)} className="rounded-lg p-2 text-slate-400 opacity-100 hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100" title="Copy chunk text">
                  {copiedId === chunk.chunk_id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">{chunk.text}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-mono text-slate-400">
                <span>Index #{chunk.global_index}</span>
                <span>{chunk.text.length} chars</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
