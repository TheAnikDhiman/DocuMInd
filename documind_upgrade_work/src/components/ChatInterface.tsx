import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Clipboard,
  FileText,
  Keyboard,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, PromptTemplateType, RAGSettings } from "../types";

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
    label: "Extract a requirement",
    query: "What are the exact RTO and RPO disaster recovery objectives and failover triggers?",
    template: "factual" as PromptTemplateType,
    icon: ShieldCheck,
  },
  {
    label: "Summarize a section",
    query: "Summarize Q4 revenue by segment, gross margins, and FY2026 headcount projections.",
    template: "summarization" as PromptTemplateType,
    icon: Lightbulb,
  },
  {
    label: "Compare approaches",
    query: "Compare tenant data isolation mechanisms between storage-tier KMS envelope encryption and microVM sandboxing.",
    template: "comparison" as PromptTemplateType,
    icon: Clipboard,
  },
  {
    label: "Find hard numbers",
    query: "Extract all numerical thresholds and requirements for AI model bias audits and human-in-the-loop review.",
    template: "data_extraction" as PromptTemplateType,
    icon: FileText,
  },
];

const TEMPLATE_LABELS: Record<PromptTemplateType, { label: string; desc: string }> = {
  auto: { label: "Auto", desc: "Let DocuMind infer the best answer style" },
  factual: { label: "Factual", desc: "Concise answers with exact citations" },
  summarization: { label: "Summary", desc: "Structured synthesis and key takeaways" },
  comparison: { label: "Compare", desc: "Side-by-side analysis grounded in sources" },
  data_extraction: { label: "Extract", desc: "Metrics and structured facts" },
  multi_hop: { label: "Multi-hop", desc: "Cross-page associative reasoning" },
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
  const [templateOpen, setTemplateOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const submit = async (text = inputText) => {
    if (!text.trim() || isLoading) return;
    const value = text.trim();
    setInputText("");
    await onSendMessage(value, selectedTemplate);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const copyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedMessage(id);
    window.setTimeout(() => setCopiedMessage(null), 1600);
  };

  const renderMessageContent = (text: string) => (
    <div className="max-w-none break-words text-[14px] leading-7 text-slate-700">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">{children}</th>,
          td: ({ children }) => <td className="border-t border-slate-100 px-3 py-2 text-slate-700">{children}</td>,
          code: ({ children }) => <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">{children}</code>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f7f7f8]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <Bot className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Ask your documents</p>
            <p className="hidden text-[10px] text-slate-400 sm:block">Grounded responses from your indexed corpus</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Grounding on
          </span>
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              New chat
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center pb-8 pt-2">
            <div className="mx-auto w-full max-w-3xl text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">What would you like to find?</h1>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">Ask a precise question, compare evidence, or pull out exact facts from the documents you have indexed into DocuMind.</p>
            </div>

            <div className="mx-auto mt-8 w-full max-w-3xl">
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your documents..."
                  className="w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between px-2 pb-1 pt-1">
                  <div className="relative flex items-center gap-1">
                    <button
                      onClick={() => setTemplateOpen((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {TEMPLATE_LABELS[selectedTemplate].label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {templateOpen && (
                      <div className="absolute bottom-10 left-0 z-20 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/30">
                        {Object.entries(TEMPLATE_LABELS).map(([key, value]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedTemplate(key as PromptTemplateType);
                              setTemplateOpen(false);
                            }}
                            className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left ${selectedTemplate === key ? "bg-slate-100" : "hover:bg-slate-50"}`}
                          >
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <span>
                              <span className="block text-[11px] font-semibold text-slate-800">{value.label}</span>
                              <span className="block text-[10px] leading-4 text-slate-400">{value.desc}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => void submit()}
                    disabled={!inputText.trim() || isLoading}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${!inputText.trim() || isLoading ? "bg-slate-100 text-slate-300" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                    aria-label="Send question"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <Keyboard className="h-3 w-3" />
                Enter to send · Shift + Enter for a new line · Top-K {settings.top_k}
              </div>
            </div>

            <div className="mx-auto mt-9 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.label}
                    onClick={() => {
                      setSelectedTemplate(prompt.template);
                      void onSendMessage(prompt.query, prompt.template);
                    }}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-mono uppercase tracking-wide text-slate-500">
                        {TEMPLATE_LABELS[prompt.template].label}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-800">{prompt.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{prompt.query}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-7 pb-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={`${isUser ? "max-w-[82%]" : "min-w-0 flex-1 max-w-[92%]"}`}>
                    {isUser ? (
                      <div className="rounded-2xl rounded-tr-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            Grounded
                          </span>
                          {msg.template && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                              {msg.template}
                            </span>
                          )}
                          {msg.latency_ms !== undefined && (
                            <span className="text-[10px] text-slate-400">retrieved in {msg.latency_ms} ms</span>
                          )}
                          <button
                            onClick={() => void copyMessage(msg.id, msg.text)}
                            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            {copiedMessage === msg.id ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                            {copiedMessage === msg.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        {msg.text ? renderMessageContent(msg.text) : <div className="h-5 w-36 animate-pulse rounded-md bg-slate-100" />}
                        {msg.isStreaming && <span className="mt-2 inline-block h-4 w-1.5 animate-pulse rounded bg-slate-900 align-middle" />}

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 border-t border-slate-100 pt-3">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              <FileText className="h-3 w-3" />
                              Sources used
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((source, index) => (
                                <button
                                  key={source.chunk_id || index}
                                  onClick={() => onSelectCitation(source.chunk_id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                                  title={source.text.slice(0, 180)}
                                >
                                  <span className="font-semibold text-slate-900">[{index + 1}]</span>
                                  <span className="max-w-32 truncate">{source.source}</span>
                                  <span className="text-slate-400">p.{source.page_number}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="shrink-0 border-t border-slate-200/80 bg-[#f7f7f8] px-3 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up..."
                className="w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTemplateOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {TEMPLATE_LABELS[selectedTemplate].label}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => void submit()}
                  disabled={!inputText.trim() || isLoading}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${!inputText.trim() || isLoading ? "bg-slate-100 text-slate-300" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                  aria-label="Send follow-up"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {templateOpen && (
              <div className="relative">
                <div className="absolute bottom-2 left-0 z-20 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/30">
                  {Object.entries(TEMPLATE_LABELS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedTemplate(key as PromptTemplateType);
                        setTemplateOpen(false);
                      }}
                      className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left ${selectedTemplate === key ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    >
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 text-slate-500" />
                      <span>
                        <span className="block text-[11px] font-semibold text-slate-800">{value.label}</span>
                        <span className="block text-[10px] leading-4 text-slate-400">{value.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-1.5 text-center text-[9px] text-slate-400">DocuMind can make mistakes. Verify important claims against the cited source passages.</div>
          </div>
        </div>
      )}
    </div>
  );
};
