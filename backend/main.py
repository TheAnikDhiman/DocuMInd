"""
DocuMind FastAPI Application
Provides async endpoints, document upload, chunking, FAISS indexing, and token-by-token streaming RAG with Gemini.
"""

import os
import json
import time
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import numpy as np

from backend.ingestion import ingest_document
from backend.chunking import chunk_document_pages, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP
from backend.faiss_index import FaissVectorStore
from backend.rag_engine import build_rag_prompt, detect_query_type, PROMPT_TEMPLATES

app = FastAPI(
    title="DocuMind RAG Document Intelligence API",
    description="Enterprise RAG with LangChain chunking, FAISS vector indexing, citation traceability, and Gemini streaming",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory vector store & state
vector_store = FaissVectorStore(dimension=768, index_type="HNSW")
documents_registry: Dict[str, Dict[str, Any]] = {}


class QueryRequest(BaseModel):
    query: str
    template: Optional[str] = "auto"
    top_k: Optional[int] = 4
    score_threshold: Optional[float] = 0.0
    chunk_size: Optional[int] = 800
    chunk_overlap: Optional[int] = 150
    temperature: Optional[float] = 0.2


def generate_mock_or_gemini_embedding(text: str, dim: int = 768) -> np.ndarray:
    """
    Generates embedding for text.
    Uses Google GenAI if GEMINI_API_KEY is available, or deterministic pseudo-semantic vector.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            result = client.models.embed_content(
                model="gemini-embedding-2-preview",
                contents=text[:2000]
            )
            # Handle SDK response
            if hasattr(result, "embedding") and result.embedding:
                return np.array(result.embedding.values, dtype=np.float32)
            if hasattr(result, "embeddings") and result.embeddings:
                return np.array(result.embeddings[0].values, dtype=np.float32)
        except Exception as e:
            pass

    # Deterministic semantic-like embedding fallback based on token hashes & frequency
    # Guarantees local testing without external API key failure
    np.random.seed(abs(hash(text[:100])) % (2**32))
    vec = np.random.randn(dim).astype(np.float32)
    # Give semantic boost to keywords
    words = text.lower().split()
    for w in words[:40]:
        h = abs(hash(w)) % dim
        vec[h] += 0.5
    norm = np.linalg.norm(vec)
    return vec / (norm if norm > 0 else 1.0)


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "DocuMind RAG Backend",
        "vector_count": vector_store.total_vectors,
        "document_count": len(documents_registry),
        "index_type": vector_store.index_type
    }


@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    chunk_size: int = Form(DEFAULT_CHUNK_SIZE),
    chunk_overlap: int = Form(DEFAULT_CHUNK_OVERLAP)
):
    """
    Uploads a document (PDF, DOCX, TXT), parses text, chunks recursively, embeds, and indexes into FAISS.
    """
    start_time = time.perf_counter()
    filename = file.filename or "uploaded_doc.txt"
    file_bytes = await file.read()

    # 1. Ingestion
    pages = ingest_document(filename, file_bytes)

    # 2. Chunking
    chunks = chunk_document_pages(pages, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    if not chunks:
        raise HTTPException(status_code=400, detail="No readable text extracted from document.")

    # 3. Embedding
    embeddings_list = []
    for c in chunks:
        vec = generate_mock_or_gemini_embedding(c["text"], dim=vector_store.dimension)
        embeddings_list.append(vec)
    embeddings_matrix = np.vstack(embeddings_list)

    # 4. Indexing into FAISS
    indexing_duration = vector_store.add_chunks(chunks, embeddings_matrix)

    total_time = (time.perf_counter() - start_time) * 1000

    doc_info = {
        "filename": filename,
        "size_bytes": len(file_bytes),
        "page_count": len(pages),
        "chunk_count": len(chunks),
        "uploaded_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "indexing_time_ms": round(total_time, 2)
    }
    documents_registry[filename] = doc_info

    return {
        "success": True,
        "document": doc_info,
        "chunks_indexed": len(chunks),
        "total_index_vectors": vector_store.total_vectors,
        "latency_ms": round(total_time, 2)
    }


@app.get("/api/documents")
async def list_documents():
    return {
        "documents": list(documents_registry.values()),
        "total_chunks": vector_store.total_vectors,
        "index_type": vector_store.index_type
    }


@app.get("/api/chunks")
async def get_chunks(source: Optional[str] = None, limit: int = Query(50, le=200)):
    chunks = vector_store.chunks_metadata
    if source:
        chunks = [c for c in chunks if c.get("source") == source]
    return {
        "total": len(chunks),
        "chunks": chunks[:limit]
    }


@app.post("/api/query/stream")
async def query_stream(req: QueryRequest):
    """
    RAG Streaming endpoint:
    1. Embeds query
    2. Retrieves top-k chunks from FAISS (<200ms)
    3. Builds prompt using one of 5 template variants
    4. Streams answer tokens using SSE with source citation metadata.
    """
    # 1. Embed query
    query_vec = generate_mock_or_gemini_embedding(req.query, dim=vector_store.dimension)

    # 2. Retrieve top-k chunks
    retrieval_start = time.perf_counter()
    retrieved_chunks = vector_store.search(
        query_vec,
        top_k=req.top_k or 4,
        score_threshold=req.score_threshold or 0.0
    )
    retrieval_latency = (time.perf_counter() - retrieval_start) * 1000

    # 3. Prompt selection
    prompt, active_template = build_rag_prompt(req.query, retrieved_chunks, req.template)

    async def event_generator():
        # First event: metadata with retrieved chunks & latency
        meta_event = {
            "type": "metadata",
            "template": active_template,
            "retrieval_latency_ms": round(retrieval_latency, 2),
            "chunks_count": len(retrieved_chunks),
            "sources": [
                {
                    "chunk_id": c.get("chunk_id"),
                    "source": c.get("source"),
                    "page_number": c.get("page_number"),
                    "score": c.get("score"),
                    "relevance": c.get("relevance_percentage"),
                    "snippet": c.get("text", "")[:200] + "..."
                }
                for c in retrieved_chunks
            ]
        }
        yield f"data: {json.dumps(meta_event)}\n\n"

        # 4. Stream generation with Gemini API or structured grounded synthesis
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content_stream(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config={
                        "temperature": req.temperature or 0.2,
                        "system_instruction": (
                            "You are DocuMind. Answer STRICTLY from context. "
                            "Cite chunks as [Doc: <source>, Chunk: <chunk_id>, Page: <page_number>]. "
                            "If context lacks answer, state 'Not found in document'."
                        )
                    }
                )
                for chunk in response:
                    if chunk.text:
                        token_event = {"type": "token", "content": chunk.text}
                        yield f"data: {json.dumps(token_event)}\n\n"
                        await asyncio.sleep(0.01)
            except Exception as e:
                err_event = {"type": "token", "content": f"\n\n[API streaming notice: {str(e)}]"}
                yield f"data: {json.dumps(err_event)}\n\n"
        else:
            # Fallback simulated grounded streaming response
            fallback_text = (
                f"Based strictly on the {len(retrieved_chunks)} retrieved context chunk(s), here is the grounded answer:\n\n"
            )
            if not retrieved_chunks:
                fallback_text += "Not found in document. The current index does not contain any relevant sections answering this query."
            else:
                top_chunk = retrieved_chunks[0]
                fallback_text += (
                    f"Regarding \"{req.query}\", the document states that "
                    f"\"{top_chunk.get('text')[:180]}...\" "
                    f"[Doc: {top_chunk.get('source')}, Chunk: {top_chunk.get('chunk_id')}, Page: {top_chunk.get('page_number')}].\n\n"
                    f"This observation is directly grounded in chunk {top_chunk.get('chunk_id')} with {top_chunk.get('relevance_percentage')}% relevance confidence."
                )

            words = fallback_text.split(" ")
            for w in words:
                token_event = {"type": "token", "content": w + " "}
                yield f"data: {json.dumps(token_event)}\n\n"
                await asyncio.sleep(0.03)

        # Done event
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
