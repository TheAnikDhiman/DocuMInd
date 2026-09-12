import React, { useState, useEffect } from "react";
import { Database, Search, Filter, Copy, Check, Hash, FileText } from "lucide-react";
import { ChunkItem, DocumentItem } from "../types";

interface ChunkInspectorProps {
  documents: DocumentItem[];
  selectedDocumentFilter?: string;
}

export const ChunkInspector: React.FC<ChunkInspectorProps> = ({
  documents,
  selectedDocumentFilter = "",
}) => {
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState(selectedDocumentFilter);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDocumentFilter) {
      setSourceFilter(selectedDocumentFilter);
    }
  }, [selectedDocumentFilter]);

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

  useEffect(() => {
    fetchChunks();
  }, [sourceFilter, searchTerm]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="chunk-inspector" className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            FAISS Vector & Chunk Inspector
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Examine the raw chunk boundaries, token lengths, and character offsets produced by
            the RecursiveCharacterTextSplitter and indexed into vector space.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Matching Chunks</span>
            <span className="text-xl font-bold font-mono text-slate-800">{totalChunks}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-chunk-search"
            type="text"
            placeholder="Search inside chunk text or chunk ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Source Dropdown */}
        <div className="w-full sm:w-64">
          <select
            id="select-document-filter"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Ingested Documents</option>
            {documents.map((d) => (
              <option key={d.id} value={d.filename}>
                {d.filename} ({d.chunk_count} chunks)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chunks Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading vector chunks from index...
        </div>
      ) : chunks.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          No chunks found matching current filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chunks.map((chunk, idx) => (
            <div
              key={chunk.chunk_id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-slate-800 truncate" title={chunk.chunk_id}>
                      {chunk.chunk_id}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(chunk.text, chunk.chunk_id)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0"
                    title="Copy chunk text"
                  >
                    {copiedId === chunk.chunk_id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                    <FileText className="w-3 h-3 text-slate-400" />
                    {chunk.source}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">
                    Page {chunk.page_number}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">
                    {chunk.token_count} tokens
                  </span>
                </div>

                {/* Text Content */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg font-sans border border-slate-100">
                  {chunk.text}
                </p>
              </div>

              <div className="mt-3 pt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-100">
                <span>Index Position: #{chunk.global_index}</span>
                <span>Length: {chunk.text.length} chars</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
