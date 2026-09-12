import React from "react";
import {
  FileText,
  Database,
  Search,
  Activity,
  Zap,
  Sliders,
  Sparkles,
} from "lucide-react";

interface HeaderProps {
  activeTab: "chat" | "documents" | "chunks" | "benchmark";
  setActiveTab: (tab: "chat" | "documents" | "chunks" | "benchmark") => void;
  documentCount: number;
  chunkCount: number;
  onOpenSettings?: () => void;
  onOpenBenchmark?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  chunkCount,
  onOpenSettings,
}) => {
  return (
    <header
      id="documind-header"
      className="bg-white border-b border-slate-200 sticky top-0 z-30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                DocuMind
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                RAG Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              LangChain · FAISS Vector Store · Gemini Flash
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            id="tab-chat"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-white text-slate-900 shadow-xs shadow-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Q&A Chat</span>
          </button>

          <button
            id="tab-documents"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "documents"
                ? "bg-white text-slate-900 shadow-xs shadow-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Document Vault</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {documentCount}
            </span>
          </button>

          <button
            id="tab-chunks"
            onClick={() => setActiveTab("chunks")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chunks"
                ? "bg-white text-slate-900 shadow-xs shadow-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chunk Inspector</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
              {chunkCount}
            </span>
          </button>

          <button
            id="tab-benchmark"
            onClick={() => setActiveTab("benchmark")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "benchmark"
                ? "bg-white text-slate-900 shadow-xs shadow-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>10k Scale SLA</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
              &lt;200ms
            </span>
          </button>
        </nav>

        {/* Right Status Badge & Settings */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/80 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>FAISS HNSW Online</span>
            <span className="text-emerald-400">|</span>
            <span className="font-mono text-emerald-900">{chunkCount} Vectors</span>
          </div>

          {onOpenSettings && (
            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="RAG Hyperparameters"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
