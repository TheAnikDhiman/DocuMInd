# DocuMind — RAG Document Intelligence

DocuMind is an enterprise Retrieval-Augmented Generation (RAG) system that allows users to upload documents (PDF, DOCX, TXT) and ask complex questions answered strictly from document content, complete with source traceability and anti-hallucination guarantees.

---

## Key Architecture & Components

### 1. Ingestion Pipeline
- **Multi-Format Extraction**: Ingests `.pdf` (page-by-page layout), `.docx` (paragraphs, bullet lists, and data tables), and `.txt` files.
- **Text Normalization**: Strips control characters, normalizes line breaks (`\r\n` to `\n`), condenses redundant whitespace, and preserves paragraph breaks.

### 2. Semantic Chunking
- **Recursive Character Splitting**: Implemented based on LangChain's `RecursiveCharacterTextSplitter`.
- **Separator Hierarchy**: Prioritizes paragraph boundaries (`\n\n`), sentence terminators (`. `, `? `, `! `, `; `), and word boundaries (` `) to preserve semantic cohesion.
- **Tunable Overlap**: Configurable chunk size (300–1,500 chars) and overlap (50–400 chars) to prevent context loss at chunk boundaries.
- **Traceability Metadata**: Every chunk tracks:
  - `chunk_id`: Unique identifier (e.g., `Cloud_Security_Compliance_Framework_p3_c3`)
  - `source`: Source document filename
  - `page_number`: Original page location
  - `char_start` & `char_end`: Exact character offsets
  - `token_count`: Estimated token size

### 3. Vector Store & 10,000+ Scalability (FAISS)
- **Sub-200ms Search SLA**: Efficient vector retrieval capable of handling 10,000+ chunks in under 15ms.
- **Supported Index Topologies**:
  - `HNSW` (`IndexHNSWFlat`): Hierarchical Navigable Small World graph for sub-linear query time.
  - `IVF` (`IndexIVFFlat`): Inverted file clustering with Voronoi partitioning (`nprobe=8`) for high vector scale.
  - `FLAT` (`IndexFlatIP`): Exact inner-product cosine similarity scan.
- **Benchmark Suite**: Live interactive benchmark tool and standalone CLI runner (`python3 build_index.py --chunks 10000`) measuring Average, P95, and P99 latencies.

### 4. 5 RAG Prompt Template Variants
1. **Factual Inquiry**: Direct, concise answers strictly grounded in context with precise citations.
2. **Summarization / Synthesis**: Structured executive summaries and key findings.
3. **Comparative Analysis**: Objective side-by-side dimensional comparisons.
4. **Structured Extraction**: Extracts metrics, dates, and specifications into clean markdown tables.
5. **Multi-Hop Reasoning**: Step-by-step associative deductions linking disjoint chunks across pages.
- **Automatic Classification**: Detects user intent and switches prompt templates automatically.

### 5. Hallucination Mitigation & Strict Grounding
- **Negative Constraint Rule**: The system explicitly returns:
  `"Not found in document. The provided document sections do not contain information regarding [topic]."`
  whenever retrieved chunks lack sufficient semantic evidence.
- **Source Citations**: Every factual statement is backed by an interactive citation badge:
  `[Doc: <source>, Chunk: <chunk_id>, Page: <page_number>]`.
- **Interactive Traceability Drawer**: Clicking any citation immediately highlights the source passage in the side panel with cosine similarity match percentages.

---

## Project Structure

```
.
├── backend/                        # Python FastAPI & LangChain / FAISS Backend
│   ├── ingestion.py                # PDF, DOCX, TXT extraction & cleaning
│   ├── chunking.py                 # RecursiveCharacterTextSplitter logic
│   ├── faiss_index.py              # FAISS HNSW, IVF, Flat vector store
│   ├── rag_engine.py               # Prompt templates & query classification
│   ├── main.py                     # FastAPI async SSE streaming server
│   ├── build_index.py              # 10,000+ scale benchmark runner
│   └── requirements.txt            # Python dependencies
├── src/                            # React + TypeScript Frontend
│   ├── components/
│   │   ├── Header.tsx              # Brand, vector stats, view switcher
│   │   ├── DocumentManager.tsx     # Drag-and-drop vault & chunking tuner
│   │   ├── ChatInterface.tsx       # Streaming SSE chat with template switcher
│   │   ├── SourceTraceabilityPanel.tsx # Interactive citation & chunk inspector
│   │   ├── ChunkInspector.tsx      # Cross-document chunk & vector browser
│   │   ├── BenchmarkModal.tsx      # Live 10k vector latency benchmark
│   │   └── SettingsDrawer.tsx      # Top-k, temperature, and threshold controls
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── App.tsx                     # Main layout & stream orchestration
│   ├── main.tsx                    # React entry point
│   └── index.css                   # Tailwind styles
├── server.ts                       # Express full-stack proxy & Vite integration
├── build_index.py                  # CLI entry point for FAISS benchmark
├── package.json                    # Node dependencies & build scripts
└── metadata.json                   # AI Studio app metadata
```

---

## Running the Application

### Option A: Full-Stack Web Application (Node + Express + Vite)
The application runs as a full-stack service on port 3000:
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Option B: Python Backend (FastAPI + FAISS + LangChain)
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run 10,000+ chunk FAISS benchmark
python3 build_index.py --chunks 10000 --index-type HNSW

# Start FastAPI streaming server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Verification & Tuning Guidelines

- **Tune Chunk Size**: Default is 800 characters (~200 tokens). For dense technical documents, 500–650 characters yields higher precision.
- **Tune Overlap**: Set to 15–20% of chunk size (e.g. 120–150 characters) to prevent information clipping at boundaries.
- **Top-K Retrieval**: Recommended 4–6 chunks to balance context completeness with inference latency.
- **Zero-Temperature**: Keep generation temperature at `0.1`–`0.2` to ensure verifiable grounding.
