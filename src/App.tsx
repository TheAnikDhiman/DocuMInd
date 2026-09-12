import React, { useState, useEffect } from "react";
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
import { BookOpen, Sliders } from "lucide-react";

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
    temperature: 0.2,
    index_type: "HNSW",
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

  // Fetch documents on load
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

  // Streaming Query Execution
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          template,
          top_k: settings.top_k,
          score_threshold: settings.score_threshold,
          temperature: settings.temperature,
          index_type: settings.index_type,
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
          } catch (e) {
            // Ignore partial SSE parsing fragments
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
    // Auto clear highlight pulse after 3.5s
    setTimeout(() => {
      setHighlightedChunkId((curr) => (curr === chunkId ? null : curr));
    }, 3500);
  };

  const handleSelectDocForChunks = (filename: string) => {
    setSelectedDocForChunks(filename);
    setActiveTab("chunks");
  };

  const totalChunkCount = documents.reduce((acc, d) => acc + d.chunk_count, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        chunkCount={totalChunkCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left: Chat Window */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                onSelectCitation={handleSelectCitation}
                onClearChat={() => {
                  setMessages([]);
                  setActiveSources([]);
                }}
                settings={settings}
              />
            </div>

            {/* Right: Source Traceability Sidebar (Desktop) */}
            <div className="hidden lg:block w-[380px] xl:w-[440px] h-full overflow-hidden shrink-0">
              <SourceTraceabilityPanel
                sources={activeSources}
                retrievalLatencyMs={retrievalLatency}
                highlightedChunkId={highlightedChunkId}
                onSelectChunk={(id) => setHighlightedChunkId(id)}
              />
            </div>

            {/* Mobile Source Traceability Toggle Button */}
            <div className="lg:hidden fixed bottom-20 right-4 z-20">
              <button
                onClick={() => setMobileTraceDrawerOpen(!mobileTraceDrawerOpen)}
                className="flex items-center gap-2 bg-blue-600 text-white px-3.5 py-2 rounded-full shadow-lg text-xs font-semibold"
              >
                <BookOpen className="w-4 h-4" />
                <span>Sources ({activeSources.length})</span>
              </button>
            </div>

            {/* Mobile Source Drawer */}
            {mobileTraceDrawerOpen && (
              <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 flex justify-end">
                <div className="w-5/6 max-w-md h-full bg-white flex flex-col">
                  <div className="p-3 border-b flex justify-between items-center bg-slate-50">
                    <span className="text-xs font-bold text-slate-800">
                      Traceable Sources
                    </span>
                    <button
                      onClick={() => setMobileTraceDrawerOpen(false)}
                      className="text-xs font-bold text-slate-500 px-2 py-1"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <SourceTraceabilityPanel
                      sources={activeSources}
                      retrievalLatencyMs={retrievalLatency}
                      highlightedChunkId={highlightedChunkId}
                      onSelectChunk={(id) => setHighlightedChunkId(id)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="flex-1 overflow-y-auto">
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
          <div className="flex-1 overflow-y-auto">
            <ChunkInspector
              documents={documents}
              selectedDocumentFilter={selectedDocForChunks}
            />
          </div>
        )}

        {activeTab === "benchmark" && (
          <div className="flex-1 overflow-y-auto">
            <BenchmarkModal />
          </div>
        )}
      </main>

      {/* RAG Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
}
