import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  HardDrive,
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFileUpload(e.target.files[0]);
    }
  };

  const processFileUpload = async (file: File) => {
    const validExtensions = [".pdf", ".docx", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage(`Invalid file format '${fileExt}'. Please upload a PDF, DOCX, or TXT file.`);
      return;
    }

    setErrorMessage(null);
    setUploading(true);
    setUploadProgress("Extracting text and cleaning document structure...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chunk_size", chunkSize.toString());
      formData.append("chunk_overlap", chunkOverlap.toString());

      setUploadProgress("Applying RecursiveCharacterTextSplitter & generating FAISS embeddings...");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

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

  const handleDeleteDocument = async (id: string, filename: string) => {
    if (!confirm(`Remove "${filename}" and purge all its chunks from the FAISS vector index?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div id="document-manager" className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Overview & Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            Document Ingestion & Chunking Pipeline
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Upload enterprise documents (PDF, DOCX, TXT). Text is extracted, cleaned, partitioned
            using LangChain's RecursiveCharacterTextSplitter with calibrated overlap, and indexed into FAISS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Active Chunks</span>
            <span className="text-xl font-bold font-mono text-slate-800">
              {documents.reduce((acc, d) => acc + d.chunk_count, 0)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Total Docs</span>
            <span className="text-xl font-bold font-mono text-slate-800">{documents.length}</span>
          </div>
        </div>
      </div>

      {/* Upload Zone & Chunking Tuner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dropzone */}
        <div className="lg:col-span-2">
          <div
            id="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
              isDragging
                ? "border-blue-500 bg-blue-50/70 scale-[1.005]"
                : "border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>

            <h3 className="text-base font-semibold text-slate-800 mb-1">
              {uploading ? "Ingesting Document..." : "Drag & drop files or click to browse"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-3">
              Supports <span className="font-semibold text-slate-700">PDF, DOCX, TXT</span> documents up to 25MB.
            </p>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50/90 px-3 py-1.5 rounded-full border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadProgress}</span>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {lastUploadStats && (
            <div className="mt-3 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200/90 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Successfully ingested <strong className="font-semibold">{lastUploadStats.filename}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-emerald-900">
                <span>{lastUploadStats.chunks} chunks generated</span>
                <span>•</span>
                <span>{lastUploadStats.latency_ms} ms pipeline</span>
              </div>
            </div>
          )}
        </div>

        {/* Chunk Tuning Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Chunking Hyperparameters
              </h3>
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                LangChain Tune
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-semibold text-slate-700">Chunk Size</label>
                  <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {chunkSize} chars (~{Math.round(chunkSize / 4)} tokens)
                  </span>
                </div>
                <input
                  id="input-chunk-size"
                  type="range"
                  min="300"
                  max="1500"
                  step="50"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Target size for each semantic chunk before recursive split.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-semibold text-slate-700">Chunk Overlap</label>
                  <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {chunkOverlap} chars (~{Math.round(chunkOverlap / 4)} tokens)
                  </span>
                </div>
                <input
                  id="input-chunk-overlap"
                  type="range"
                  min="0"
                  max="400"
                  step="25"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Maintains contextual coherence across neighboring chunk boundaries.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Separator Hierarchy:</span>
              <span className="font-mono text-slate-700 text-[10px]">\n\n → \n → . → ? → space</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Normalization:</span>
              <span className="font-mono text-emerald-700 font-semibold">Cleaned & Stripped</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ingested Document Repository</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Documents stored in memory and indexed into FAISS vector space.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No documents ingested yet. Upload a PDF, DOCX, or TXT document above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Ingested At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          {doc.format === "pdf" ? (
                            <FileText className="w-4 h-4" />
                          ) : doc.format === "docx" ? (
                            <FileCode className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 text-xs block truncate max-w-xs">
                            {doc.filename}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Chunk size: {doc.chunk_size} | Overlap: {doc.chunk_overlap}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {doc.format}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {formatBytes(doc.size_bytes)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {doc.page_count}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onSelectDocumentForChunks(doc.filename)}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-mono font-semibold hover:underline"
                        title="View chunks in inspector"
                      >
                        <span>{doc.chunk_count}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(doc.uploaded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        id={`btn-delete-${doc.id}`}
                        onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document and purge vectors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
