import React, { useEffect, useState } from "react";
import { BookOpen, PanelRight, X } from "lucide-react";
import { Header } from "./components/Header";
import { DocumentManager } from "./components/DocumentManager";
import { ChatInterface } from "./components/ChatInterface";
import { SourceTraceabilityPanel } from "./components/SourceTraceabilityPanel";
import { ChunkInspector } from "./components/ChunkInspector";
import { BenchmarkModal } from "./components/BenchmarkModal";
import { SettingsDrawer } from "./components/SettingsDrawer";
import {
  DocumentItem,
  ChatMessage,
  PromptTemplateType,
  RAGSettings,
  ChunkItem,
} from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "documents" | "chunks" | "benchmark"
  >("chat");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplateType>("auto");
  const [settings, setSettings] = useState<RAGSettings>({
    template: "auto",
    top_k: 4,
    score_threshold: 0.1,
    chunk_size: 800,
    chunk_overlap: 150,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(
    null
  );
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<string>("");
  const [activeSources, setActiveSources] = useState<ChunkItem[]>([]);
  const [retrievalLatency, setRetrievalLatency] = useState<number | undefined>();
  const [mobileTraceDrawerOpen, setMobileTraceDrawerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const loadDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setActiveSources([]);
    setRetrievalLatency(undefined);
    setHighlightedChunkId(null);
    setActiveTab("chat");
    setMobileSidebarOpen(false);
  };

  const handleSendMessage = async (
    query: string,
    template: PromptTemplateType
  ) => {
    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `assistant_${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: query,
      timestamp: new Date().toISOString(),
    };

    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      timestamp: new Date().toISOString(),
      template: template === "auto" ? "factual" : template,
      isStreaming: true,
      sources: [],
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          template,
          top_k: settings.top_k,
          score_threshold: settings.score_threshold,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to initialize RAG streaming response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulatedText = "";
      let retrievedSources: ChunkItem[] = [];
      let detectedTemplate = template;
      let latency: number | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const payload = JSON.parse(trimmed.slice(6));

            if (payload.type === "metadata") {
              retrievedSources = payload.sources || [];
              detectedTemplate = payload.template;
              latency = payload.retrieval_latency_ms;

              setActiveSources(retrievedSources);
              setRetrievalLatency(latency);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        template: detectedTemplate,
                        sources: retrievedSources,
                        latency_ms: latency,
                      }
                    : msg
                )
              );
            } else if (payload.type === "token") {
              accumulatedText += payload.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, text: accumulatedText }
                    : msg
                )
              );
            } else if (payload.type === "done") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
            }
          } catch {
            // Ignore partial SSE parsing fragments.
          }
        }
      }
    } catch (err: any) {
      console.error("Stream processing error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: `Error connecting to RAG pipeline: ${
                  err.message || "Unknown error"
                }`,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCitation = (chunkId: string) => {
    setHighlightedChunkId(chunkId);
    setMobileTraceDrawerOpen(true);
    setTimeout(() => {
      setHighlightedChunkId((curr) => (curr === chunkId ? null : curr));
    }, 3500);
  };

  const handleSelectDocForChunks = (filename: string) => {
    setSelectedDocForChunks(filename);
    setActiveTab("chunks");
    setMobileSidebarOpen(false);
  };

  const totalChunkCount = documents.reduce((acc, d) => acc + d.chunk_count, 0);

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileSidebarOpen(false);
        }}
        documentCount={documents.length}
        chunkCount={totalChunkCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={handleNewChat}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onMobileOpen={() => setMobileSidebarOpen(true)}
      />

      <div className="pt-14 md:pl-[268px] md:pt-0 min-h-screen">
        <main className="h-screen min-h-0 flex flex-col overflow-hidden">
          {activeTab === "chat" && (
            <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
              <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                  onSelectCitation={handleSelectCitation}
                  onClearChat={handleNewChat}
                  settings={settings}
                />
              </div>

              <div className="hidden xl:block w-[360px] 2xl:w-[400px] h-full shrink-0">
                <SourceTraceabilityPanel
                  sources={activeSources}
                  retrievalLatencyMs={retrievalLatency}
                  highlightedChunkId={highlightedChunkId}
                  onSelectChunk={(id) => setHighlightedChunkId(id)}
                />
              </div>

              <div className="xl:hidden fixed bottom-5 right-5 z-30">
                <button
                  onClick={() => setMobileTraceDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl shadow-slate-300/40"
                >
                  <PanelRight className="h-4 w-4" />
                  Sources <span className="rounded-full bg-white/15 px-1.5">{activeSources.length}</span>
                </button>
              </div>

              {mobileTraceDrawerOpen && (
                <div className="xl:hidden fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]">
                  <div className="absolute inset-y-0 right-0 w-[92%] max-w-md bg-white shadow-2xl">
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <BookOpen className="h-4 w-4 text-slate-500" />
                          Sources
                        </div>
                        <button
                          onClick={() => setMobileTraceDrawerOpen(false)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Close source panel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1">
                        <SourceTraceabilityPanel
                          sources={activeSources}
                          retrievalLatencyMs={retrievalLatency}
                          highlightedChunkId={highlightedChunkId}
                          onSelectChunk={(id) => setHighlightedChunkId(id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DocumentManager
                documents={documents}
                onUploadSuccess={loadDocuments}
                onSelectDocumentForChunks={handleSelectDocForChunks}
                chunkSize={settings.chunk_size}
                setChunkSize={(size) =>
                  setSettings((prev) => ({ ...prev, chunk_size: size }))
                }
                chunkOverlap={settings.chunk_overlap}
                setChunkOverlap={(overlap) =>
                  setSettings((prev) => ({ ...prev, chunk_overlap: overlap }))
                }
              />
            </div>
          )}

          {activeTab === "chunks" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChunkInspector
                documents={documents}
                selectedDocumentFilter={selectedDocForChunks}
              />
            </div>
          )}

          {activeTab === "benchmark" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <BenchmarkModal />
            </div>
          )}
        </main>
      </div>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
}
