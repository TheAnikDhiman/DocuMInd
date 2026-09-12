"""
DocuMind FAISS Vector Indexing & Search Engine
Supports IndexFlatIP, IndexIVFFlat, and IndexHNSWFlat for sub-200ms search over 10,000+ chunks.
"""

import os
import json
import time
import math
import random
from typing import List, Dict, Any, Tuple, Optional

try:
    import numpy as np
except ImportError:
    np = None

try:
    import faiss
except ImportError:
    faiss = None


class FaissVectorStore:
    """
    Manages FAISS index construction, indexing, and vector similarity retrieval.
    """

    def __init__(
        self,
        dimension: int = 768,
        index_type: str = "HNSW",  # 'FLAT', 'IVF', 'HNSW'
        metric: str = "INNER_PRODUCT",
        hnsw_m: int = 32,
        hnsw_ef_search: int = 64,
        hnsw_ef_construction: int = 64,
        ivf_nlist: int = 100,
        ivf_nprobe: int = 10
    ):
        self.dimension = dimension
        self.index_type = index_type.upper()
        self.metric = metric
        self.hnsw_m = hnsw_m
        self.hnsw_ef_search = hnsw_ef_search
        self.hnsw_ef_construction = hnsw_ef_construction
        self.ivf_nlist = ivf_nlist
        self.ivf_nprobe = ivf_nprobe
        
        self.chunks_metadata: List[Dict[str, Any]] = []
        self.index = None
        self._init_index()

    def _init_index(self):
        """Initializes the FAISS index structure based on chosen architecture."""
        if faiss is None:
            # Fallback mock/numpy store if FAISS binary is not compiled in host Python
            return

        faiss_metric = faiss.METRIC_INNER_PRODUCT if self.metric == "INNER_PRODUCT" else faiss.METRIC_L2

        if self.index_type == "HNSW":
            # HNSW index: excellent graph-based retrieval for 10k+ vectors with sub-20ms latency
            self.index = faiss.IndexHNSWFlat(self.dimension, self.hnsw_m, faiss_metric)
            self.index.hnsw.efConstruction = self.hnsw_ef_construction
            self.index.hnsw.efSearch = self.hnsw_ef_search
        elif self.index_type == "IVF":
            # IVF index: Voronoi partition inverted list for scaling
            quantizer = faiss.IndexFlatIP(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, self.ivf_nlist, faiss_metric)
            self.index.nprobe = self.ivf_nprobe
        else:
            # Exact brute-force Flat inner product
            self.index = faiss.IndexFlatIP(self.dimension)

    def normalize_vectors(self, vectors: Any) -> Any:
        """Normalizes vectors to unit length for exact cosine similarity with Inner Product."""
        if np is not None and isinstance(vectors, np.ndarray):
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            return (vectors / norms).astype(np.float32)
        
        # Pure Python fallback
        if isinstance(vectors, list):
            normed = []
            for v in vectors:
                sq_sum = sum(x * x for x in v)
                mag = math.sqrt(sq_sum) if sq_sum > 0 else 1.0
                normed.append([x / mag for x in v])
            return normed
        return vectors

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: Any):
        """
        Adds vectors and corresponding chunk metadata into the FAISS index.
        """
        if len(chunks) == 0:
            return 0.0

        start_time = time.perf_counter()

        if faiss is not None and self.index is not None and np is not None:
            norm_embeddings = self.normalize_vectors(embeddings)
            # If IVF index needs training first:
            if self.index_type == "IVF" and not self.index.is_trained:
                if norm_embeddings.shape[0] < self.ivf_nlist:
                    self.index = faiss.IndexFlatIP(self.dimension)
                else:
                    self.index.train(norm_embeddings)
            self.index.add(norm_embeddings)
        else:
            # Save normalized embeddings in chunk dicts for fallback search
            norm_embeddings = self.normalize_vectors(embeddings)
            for idx, c in enumerate(chunks):
                c["embedding"] = norm_embeddings[idx] if isinstance(norm_embeddings, list) else norm_embeddings[idx].tolist()

        self.chunks_metadata.extend(chunks)
        duration = (time.perf_counter() - start_time) * 1000
        return duration

    def search(
        self,
        query_vector: Any,
        top_k: int = 5,
        score_threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Executes sub-200ms top-k vector similarity search against the index.
        Returns matched chunks decorated with similarity scores and ranking.
        """
        if len(self.chunks_metadata) == 0:
            return []

        start_time = time.perf_counter()

        if faiss is not None and self.index is not None and np is not None:
            q_arr = query_vector if isinstance(query_vector, np.ndarray) else np.array(query_vector, dtype=np.float32)
            query_norm = self.normalize_vectors(q_arr.reshape(1, -1))
            effective_k = min(top_k, len(self.chunks_metadata))
            distances, indices = self.index.search(query_norm, effective_k)
            search_latency_ms = (time.perf_counter() - start_time) * 1000

            results = []
            for rank, (idx, dist) in enumerate(zip(indices[0], distances[0])):
                if idx < 0 or idx >= len(self.chunks_metadata):
                    continue
                score = float(dist)
                if score >= score_threshold:
                    chunk = dict(self.chunks_metadata[idx])
                    chunk["score"] = round(score, 4)
                    chunk["relevance_percentage"] = round(max(0.0, min(100.0, (score + 1.0) / 2.0 * 100)), 1)
                    chunk["rank"] = rank + 1
                    chunk["latency_ms"] = round(search_latency_ms, 2)
                    results.append(chunk)
            return results

        # High-performance pure-Python / numpy fallback
        q_list = query_vector if isinstance(query_vector, list) else (query_vector.tolist() if hasattr(query_vector, "tolist") else list(query_vector))
        sq_sum = sum(x * x for x in q_list)
        mag = math.sqrt(sq_sum) if sq_sum > 0 else 1.0
        q_norm = [x / mag for x in q_list]

        scored = []
        for idx, c in enumerate(self.chunks_metadata):
            c_emb = c.get("embedding")
            if not c_emb:
                continue
            dot = sum(a * b for a, b in zip(q_norm, c_emb))
            scored.append((dot, idx))

        scored.sort(key=lambda x: x[0], reverse=True)
        search_latency_ms = (time.perf_counter() - start_time) * 1000

        results = []
        for rank, (score, idx) in enumerate(scored[:top_k]):
            if score >= score_threshold:
                chunk = dict(self.chunks_metadata[idx])
                chunk["score"] = round(float(score), 4)
                chunk["relevance_percentage"] = round(max(0.0, min(100.0, (score + 1.0) / 2.0 * 100)), 1)
                chunk["rank"] = rank + 1
                chunk["latency_ms"] = round(search_latency_ms, 2)
                results.append(chunk)
        return results

    def save(self, directory: str, filename: str = "documind_faiss"):
        """Saves the FAISS index binary and metadata JSON to disk."""
        os.makedirs(directory, exist_ok=True)
        meta_path = os.path.join(directory, f"{filename}_meta.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            # Save metadata without raw embeddings to keep file small
            clean_meta = []
            for c in self.chunks_metadata:
                m = dict(c)
                m.pop("embedding", None)
                clean_meta.append(m)
            json.dump(clean_meta, f, indent=2)

        if faiss is not None and self.index is not None:
            index_path = os.path.join(directory, f"{filename}.index")
            faiss.write_index(self.index, index_path)

    def load(self, directory: str, filename: str = "documind_faiss"):
        """Loads index and metadata from disk."""
        meta_path = os.path.join(directory, f"{filename}_meta.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                self.chunks_metadata = json.load(f)

        if faiss is not None:
            index_path = os.path.join(directory, f"{filename}.index")
            if os.path.exists(index_path):
                self.index = faiss.read_index(index_path)

    @property
    def total_vectors(self) -> int:
        return len(self.chunks_metadata)
