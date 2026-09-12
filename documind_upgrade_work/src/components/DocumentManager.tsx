import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCode2,
  FileText,
  HardDrive,
  Layers3,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { DocumentItem } from "../types";

interface DocumentManagerProps {
  documents: DocumentItem[];
  onUploadSuccess: () => void;
  onSelectDocumentForChunks: (filename: string) => void;
  chunkSize: number;
  setChunkSize: (size: number) => void;
  chunkOverlap: number;
  setChunkOverlap: (overlap: number) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onUploadSuccess,
  onSelectDocumentForChunks,
  chunkSize,
  setChunkSize,
  chunkOverlap,
  setChunkOverlap,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUploadStats, setLastUploadStats] = useState<{
    filename: string;
    chunks: number;
    latency_ms: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileUpload = async (file: File) => {
    const validExtensions = [".pdf", ".docx", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage(`Invalid file format '${fileExt}'. Please upload a PDF, DOCX, or TXT file.`);
      return;
    }

    setErrorMessage(null);
    setUploading(true);
    setUploadProgress("Reading document and preparing text...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chunk_size", chunkSize.toString());
      formData.append("chunk_overlap", chunkOverlap.toString());

      setUploadProgress("Chunking content and creating vector embeddings...");
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setLastUploadStats({
        filename: file.name,
        chunks: data.chunks_created,
        latency_ms: data.latency_ms,
      });
      onUploadSuccess();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while uploading.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFileUpload(file);
  };

  const handleDeleteDocument = async (id: string, filename: string) => {
    if (!confirm(`Remove "${filename}" and purge all its chunks from the FAISS vector index?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) onUploadSuccess();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div id="document-manager" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Knowledge base</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Documents</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Upload source material, tune chunking, and keep the retrieval corpus clean.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">{documents.length} documents</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono">{documents.reduce((a, d) => a + d.chunk_count, 0)} chunks</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Add a document</h2>
              <p className="mt-1 text-[11px] text-slate-500">PDF, DOCX, or TXT · up to 25 MB</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">Indexed automatically</span>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 text-center transition ${isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-[#fafafa] hover:border-slate-400 hover:bg-slate-50"}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void processFileUpload(e.target.files[0])}
              disabled={uploading}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300/30">
              {uploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <UploadCloud className="h-5 w-5" />}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{uploading ? "Ingesting document…" : "Drop a file here or browse"}</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">DocuMind will extract text, split it into retrieval-friendly chunks, then update the vector index.</p>
            {uploadProgress && <div className="mt-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">{uploadProgress}</div>}
          </div>

          {errorMessage && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[11px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {lastUploadStats && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[11px] text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" />Indexed {lastUploadStats.filename}</span>
              <span className="font-mono text-[10px]">{lastUploadStats.chunks} chunks · {lastUploadStats.latency_ms} ms</span>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><Layers3 className="h-4 w-4 text-slate-700" /></div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Chunking</h2>
              <p className="text-[10px] text-slate-400">Recursive splitter parameters</p>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
                <label className="font-medium text-slate-700">Chunk size</label>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700">{chunkSize} chars</span>
              </div>
              <input id="input-chunk-size" type="range" min="300" max="1500" step="50" value={chunkSize} onChange={(e) => setChunkSize(parseInt(e.target.value))} className="w-full accent-slate-900" />
              <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Larger chunks preserve context; smaller chunks improve retrieval precision.</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
                <label className="font-medium text-slate-700">Chunk overlap</label>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700">{chunkOverlap} chars</span>
              </div>
              <input id="input-chunk-overlap" type="range" min="0" max="400" step="25" value={chunkOverlap} onChange={(e) => setChunkOverlap(parseInt(e.target.value))} className="w-full accent-slate-900" />
              <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Keeps context shared across neighboring chunks.</p>
            </div>
          </div>
          <div className="mt-7 rounded-xl bg-slate-50 p-3.5 text-[10px] text-slate-500">
            <div className="flex items-center justify-between"><span>Separators</span><span className="font-mono text-slate-700">\\n\\n → \\n → . → ? → space</span></div>
            <div className="mt-2 flex items-center justify-between"><span>Normalization</span><span className="font-medium text-emerald-700">Cleaned & stripped</span></div>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Indexed documents</h2>
            <p className="mt-0.5 text-[10px] text-slate-400">Each source is available to the retrieval and citation pipeline.</p>
          </div>
          <HardDrive className="hidden h-4 w-4 text-slate-300 sm:block" />
        </div>
        {documents.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-xs font-medium text-slate-600">Your document library is empty</p>
            <p className="mt-1 text-[10px] text-slate-400">Upload a source above to begin building your corpus.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    {doc.format === "docx" ? <FileCode2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">{doc.filename}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="uppercase">{doc.format}</span><span>·</span><span>{formatBytes(doc.size_bytes)}</span><span>·</span><span>{doc.page_count} pages</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-slate-600">{doc.chunk_count} chunks</span>
                  <span className="hidden items-center gap-1 text-slate-400 lg:flex"><Clock3 className="h-3 w-3" />{new Date(doc.uploaded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-1 sm:ml-2">
                  <button onClick={() => onSelectDocumentForChunks(doc.filename)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900" title="View chunks">
                    Inspect <ArrowRight className="h-3 w-3" />
                  </button>
                  <button id={`btn-delete-${doc.id}`} onClick={() => void handleDeleteDocument(doc.id, doc.filename)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete document">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
