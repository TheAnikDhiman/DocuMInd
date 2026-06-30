from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# Load model once
model = SentenceTransformer("BAAI/bge-small-en-v1.5")


def create_vector_store(chunks):
    embeddings = model.encode(
        chunks,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings.astype("float32"))

    return index, chunks


def search(index, chunks, query, k=4):
    query_embedding = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    scores, indices = index.search(
        query_embedding.astype("float32"),
        k,
    )

    return [chunks[i] for i in indices[0]]