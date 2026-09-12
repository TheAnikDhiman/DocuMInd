import React from "react";
import {
  Activity,
  Bot,
  Database,
  FileText,
  FolderOpen,
  Gauge,
  Menu,
  Plus,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

interface HeaderProps {
  activeTab: "chat" | "documents" | "chunks" | "benchmark";
  setActiveTab: (tab: "chat" | "documents" | "chunks" | "benchmark") => void;
  documentCount: number;
  chunkCount: number;
  onOpenSettings?: () => void;
  onNewChat?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileOpen?: () => void;
}

const navItems = [
  { id: "chat", label: "Ask documents", icon: Bot },
  { id: "documents", label: "Document library", icon: FolderOpen },
  { id: "chunks", label: "Vector index", icon: Database },
  { id: "benchmark", label: "Benchmarks", icon: Activity },
] as const;

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  chunkCount,
  onOpenSettings,
  onNewChat,
  mobileOpen = false,
  onMobileClose,
  onMobileOpen,
}) => {
  return (
    <>
      <div className="md:hidden fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur">
        <button
          onClick={() => setActiveTab("chat")}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">DocuMind</span>
        </button>
        <button
          onClick={() => {
            if (mobileOpen) onMobileClose?.();
            else onMobileOpen?.();
          }}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <button
          className="md:hidden fixed inset-0 z-40 bg-slate-950/30"
          onClick={onMobileClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-slate-800/80 bg-[#202123] text-slate-200 shadow-2xl shadow-slate-950/20 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col px-3 py-3">
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold tracking-tight text-white">DocuMind</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-300">RAG</span>
                </div>
                <p className="text-[10px] text-slate-500">Document intelligence workspace</p>
              </div>
            </div>
            <button
              onClick={onMobileClose}
              className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="group mb-3 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs font-semibold text-white transition hover:bg-white/10"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-900">
              <Plus className="h-3.5 w-3.5" />
            </span>
            New research chat
          </button>

          <div className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              const badge =
                item.id === "documents"
                  ? documentCount
                  : item.id === "chunks"
                  ? chunkCount
                  : item.id === "benchmark"
                  ? "<200ms"
                  : null;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {badge !== null && (
                    <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] ${active ? "bg-white/10 text-slate-200" : "bg-white/5 text-slate-500"}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">System status</div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.08)]" />
                  FAISS HNSW
                </span>
                <span className="text-[10px] font-medium text-emerald-400">Online</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/10 p-2">
                  <p className="text-[9px] uppercase tracking-wide text-slate-500">Documents</p>
                  <p className="mt-1 text-sm font-semibold text-white">{documentCount}</p>
                </div>
                <div className="rounded-lg bg-black/10 p-2">
                  <p className="text-[9px] uppercase tracking-wide text-slate-500">Chunks</p>
                  <p className="mt-1 text-sm font-semibold text-white">{chunkCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1 border-t border-white/8 pt-3">
            <button
              onClick={() => onOpenSettings?.()}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <Settings2 className="h-4 w-4" />
              RAG settings
            </button>
            <a
              href="/DocuMind_Research_Architecture_Interview_Guide.pdf"
              download="DocuMind_Research_Architecture_Interview_Guide.pdf"
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <FileText className="h-4 w-4" />
              Research & interview guide
            </a>
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-[9px] text-slate-600">
            <span>Gemini Flash · LangChain · FAISS</span>
            <Gauge className="h-3.5 w-3.5" />
          </div>
        </div>
      </aside>
    </>
  );
};
