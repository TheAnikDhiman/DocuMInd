import React from "react";
import { X, Sliders, ShieldCheck, Zap, Layers } from "lucide-react";
import { RAGSettings } from "../types";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RAGSettings;
  setSettings: React.Dispatch<React.SetStateAction<RAGSettings>>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 p-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                RAG Engine Settings
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls */}
          <div className="py-6 space-y-6">
            {/* Top-K */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-slate-700">Top-K Retrieved Chunks</label>
                <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  {settings.top_k} chunks
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.top_k}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, top_k: parseInt(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Number of closest semantic chunks provided to Gemini Flash prompt.
              </p>
            </div>

            {/* Score Threshold */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-slate-700">Similarity Threshold</label>
                <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  {settings.score_threshold}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.05"
                value={settings.score_threshold}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, score_threshold: parseFloat(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Minimum cosine score required to consider a chunk relevant.
              </p>
            </div>

            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-slate-700">Generation Temperature</label>
                <span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  {settings.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.7"
                step="0.05"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                }
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Low temperature (0.1–0.2) enforces strict grounded determinism and eliminates hallucinations.
              </p>
            </div>

            {/* FAISS Index Type */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Active FAISS Index Topology
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["HNSW", "IVF", "FLAT"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, index_type: type }))}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      settings.index_type === type
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Hallucination Mitigation Rules Info */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Enforced Hallucination Protocol</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                If the query cannot be verified in the retrieved chunks, the system strictly replies with:
                <code className="block mt-1 font-mono text-[10px] bg-white/80 p-1.5 rounded border border-emerald-200">
                  "Not found in document. The current index does not contain information regarding [topic]."
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
