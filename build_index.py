"""
DocuMind Root FAISS Build Script Wrapper
Run: python build_index.py --chunks 10000 --index-type HNSW
"""
from backend.build_index import main

if __name__ == "__main__":
    main()
