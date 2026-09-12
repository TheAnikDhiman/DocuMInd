import React from "react";
import { Check, RotateCcw, Settings2, ShieldCheck, X } from "lucide-react";
import { RAGSettings } from "../types";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RAGSettings;
  setSettings: React.Dispatch<React.SetStateAction<RAGSettings>>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, settings, setSettings }) => {
  if (!isOpen) return null;

  const update = <K extends keyof RAGSettings>(key: K, value: RAGSettings[K]) => setSettings((prev) => ({ ...prev, [key]: value }));
  const reset = () => setSettings({ template: "auto", top_k: 4, score_threshold: 0.1, chunk_size: settings.chunk_size, chunk_overlap: settings.chunk_overlap });

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/25 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white"><Settings2 className="h-4 w-4" /></div>
            <div><p className="text-sm font-semibold text-slate-900">RAG settings</p><p className="text-[10px] text-slate-400">Tune retrieval and generation behavior</p></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-6">
            <SettingRange label="Top-K retrieved chunks" value={settings.top_k} min={1} max={10} step={1} suffix="chunks" onChange={(v) => update("top_k", v)} help="How many nearest chunks are passed into the answer prompt." />
            <SettingRange label="Similarity threshold" value={settings.score_threshold} min={0} max={0.8} step={0.05} suffix="score" onChange={(v) => update("score_threshold", v)} help="Minimum similarity score required before a chunk is considered relevant." />
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Live retrieval engine</label>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-800">Exact cosine similarity</span>
                  <span className="rounded-md bg-white px-2 py-1 text-[9px] font-semibold text-slate-500">Node runtime</span>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-400">FAISS HNSW/IVF/Flat scenarios are available through the Python reference backend and benchmark tools; changing them here would not change the live Node retrieval path.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Grounding guardrail</div>
              <p className="mt-2 text-[10px] leading-5 text-emerald-700">Answers are designed to stay inside the retrieved evidence. Important claims should still be checked against the cited passages.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-medium text-slate-500 hover:bg-white hover:text-slate-800"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
          <button onClick={onClose} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-slate-800"><Check className="h-3.5 w-3.5" />Done</button>
        </div>
      </div>
    </div>
  );
};

function SettingRange({ label, value, min, max, step, suffix, onChange, help }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void; help: string }) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[11px]"><label className="font-semibold text-slate-700">{label}</label><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700">{value} {suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-slate-900" style={{ background: `linear-gradient(to right, #0f172a ${percentage}%, #e2e8f0 ${percentage}%)`, height: 5, borderRadius: 999 }} />
      <p className="mt-2 text-[10px] leading-4 text-slate-400">{help}</p>
    </div>
  );
}
