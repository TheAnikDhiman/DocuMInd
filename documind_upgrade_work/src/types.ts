export interface DocumentItem {
  id: string;
  filename: string;
  size_bytes: number;
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
  format: string;
  chunk_size: number;
  chunk_overlap: number;
}

export interface ChunkItem {
  chunk_id: string;
  global_index: number;
  source: string;
  page_number: number;
  text: string;
  char_start?: number;
  char_end?: number;
  token_count: number;
  score?: number;
  relevance_percentage?: number;
  rank?: number;
  latency_ms?: number;
}

export type PromptTemplateType =
  | "auto"
  | "factual"
  | "summarization"
  | "comparison"
  | "data_extraction"
  | "multi_hop";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  template?: string;
  sources?: ChunkItem[];
  latency_ms?: number;
  isStreaming?: boolean;
}

export interface RAGSettings {
  template: PromptTemplateType;
  top_k: number;
  score_threshold: number;
  chunk_size: number;
  chunk_overlap: number;
}

export interface BenchmarkResult {
  chunks_tested: number;
  dimension: number;
  top_k: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  sub_200ms_pass: boolean;
  index_types: {
    FlatIP: { avg_ms: number; notes: string };
    IVFFlat: { avg_ms: number; notes: string };
    HNSWFlat: { avg_ms: number; notes: string };
  };
}
