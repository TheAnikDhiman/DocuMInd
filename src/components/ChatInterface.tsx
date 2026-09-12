import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, ChunkItem, PromptTemplateType, RAGSettings } from "../types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, template: PromptTemplateType) => Promise<void>;
  isLoading: boolean;
  selectedTemplate: PromptTemplateType;
  setSelectedTemplate: (template: PromptTemplateType) => void;
  onSelectCitation: (chunkId: string) => void;
  onClearChat: () => void;
  settings: RAGSettings;
}

const STARTER_PROMPTS = [
  {
    label: "Disaster Recovery SLAs",
    query: "What are the exact RTO and RPO disaster recovery objectives and failover triggers?",
    template: "factual" as PromptTemplateType,
  },
  {
    label: "Q4 Financial Breakdown",
    query: "Summarize Q4 revenue by segment, gross margins, and FY2026 headcount projections.",
    template: "summarization" as PromptTemplateType,
  },
  {
    label: "Multi-Tenant vs KMS Keys",
    query: "Compare tenant data isolation mechanisms between storage-tier KMS envelope encryption and microVM sandboxing.",
    template: "comparison" as PromptTemplateType,
  },
  {
    label: "AI Bias Auditing Metrics",
    query: "Extract all numerical thresholds and requirements for AI model bias audits and human-in-the-loop review.",
    template: "data_extraction" as PromptTemplateType,
  },
  {
    label: "Hallucination Test",
    query: "What was the company's total reported net income in fiscal year 1998?",
    template: "factual" as PromptTemplateType,
  },
];

const TEMPLATE_LABELS: Record<PromptTemplateType, { label: string; desc: string }> = {
  auto: { label: "Auto-Classify", desc: "Dynamically detects intent from question" },
  factual: { label: "Factual Inquiry", desc: "Concise direct answers with exact citations" },
  summarization: { label: "Synthesis / Summary", desc: "Structured executive summary & key takeaways" },
  comparison: { label: "Comparative Analysis", desc: "Objective side-by-side dimensional comparison" },
  data_extraction: { label: "Structured Extraction", desc: "Markdown tables & metrics without estimation" },
  multi_hop: { label: "Multi-Hop Reasoning", desc: "Step-by-step cross-page associative chains" },
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  selectedTemplate,
  setSelectedTemplate,
  onSelectCitation,
  onClearChat,
  settings,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText("");
    await onSendMessage(text, selectedTemplate);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Parses markdown text and converts [Doc: ..., Chunk: ...] into clickable citation pills
  const renderMessageContent = (text: string) => {
    return (
      <div className="prose prose-sm prose-slate max-w-none break-words">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="my-2 list-disc pl-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 list-decimal pl-4 space-y-1">{children}</ol>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg">
                <table className="min-w-full text-xs divide-y divide-slate-200">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-slate-100 px-3 py-2 text-left font-bold text-slate-700">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 border-t border-slate-100 text-slate-800">{children}</td>
            ),
            code: ({ children }) => (
              <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                {children}
              </code>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div id="chat-interface" className="flex-1 flex flex-col h-full bg-white relative">
      {/* Top Bar / Controls */}
      <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Prompt Template:
          </span>
          <select
            id="select-prompt-template"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value as PromptTemplateType)}
            className="text-xs font-semibold bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
          >
            {Object.entries(TEMPLATE_LABELS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            {TEMPLATE_LABELS[selectedTemplate]?.desc}
          </span>
        </div>

        {/* Clear & Settings indicators */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            Top-K: {settings.top_k} | Temp: {settings.temperature}
          </span>
          {messages.length > 0 && (
            <button
              id="btn-clear-chat"
              onClick={onClearChat}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              Clear Conversation
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-10 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Ask Questions Grounded in Ingested Documents
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                DocuMind uses FAISS sub-200ms semantic search, LangChain recursive chunks,
                and Gemini Flash with strict anti-hallucination protocols.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Recommended Test Queries
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedTemplate(prompt.template);
                      onSendMessage(prompt.query, prompt.template);
                    }}
                    className="p-3 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/40 transition-all text-left group bg-white shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700 mb-1">
                      <span>{prompt.label}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono">
                        {prompt.template}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 group-hover:text-slate-900 transition-colors">
                      {prompt.query}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 max-w-3xl ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  msg.role === "user"
                    ? "bg-slate-800"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xs"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-4 text-sm ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white shadow-xs rounded-tr-xs"
                    : "bg-white border border-slate-200/90 text-slate-800 shadow-xs rounded-tl-xs"
                }`}
              >
                {/* Assistant metadata header */}
                {msg.role === "assistant" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        <ShieldCheck className="w-3 h-3" />
                        Grounded
                      </span>
                      {msg.template && (
                        <span className="uppercase text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {msg.template}
                        </span>
                      )}
                    </div>

                    {msg.latency_ms !== undefined && (
                      <span className="font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {msg.latency_ms} ms
                      </span>
                    )}
                  </div>
                )}

                {/* Body */}
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                ) : (
                  <div>
                    {renderMessageContent(msg.text)}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse align-middle" />
                    )}
                  </div>
                )}

                {/* Source Citation Badges under Assistant response */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Traceable Source Passages ({msg.sources.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, idx) => (
                        <button
                          key={s.chunk_id || idx}
                          id={`citation-pill-${s.chunk_id}`}
                          onClick={() => onSelectCitation(s.chunk_id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors"
                          title={`Click to highlight in Traceability drawer\n${s.text.slice(0, 100)}...`}
                        >
                          <span className="font-bold text-blue-600">[{idx + 1}]</span>
                          <span className="truncate max-w-[130px]">{s.source}</span>
                          <span className="text-slate-400">p.{s.page_number}</span>
                          {s.relevance_percentage && (
                            <span className="text-emerald-600 font-semibold">
                              {s.relevance_percentage}%
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <textarea
            ref={inputRef}
            id="chat-query-input"
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents... (e.g., 'What is the RTO requirement in the security framework?')"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none shadow-inner"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border">Enter</kbd> to submit</span>
              <span>•</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border">Shift + Enter</kbd> for new line</span>
            </div>

            <button
              id="btn-submit-query"
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs ${
                !inputText.trim() || isLoading
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>Send Question</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
