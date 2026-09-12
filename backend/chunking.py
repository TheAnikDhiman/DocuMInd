"""
DocuMind Semantic Chunking Pipeline
Implements RecursiveCharacterTextSplitter tuned for semantic preservation and chunk traceability.
"""

from typing import List, Dict, Any

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    # Standalone RecursiveCharacterTextSplitter matching LangChain specification
    class RecursiveCharacterTextSplitter:
        def __init__(
            self,
            chunk_size: int = 800,
            chunk_overlap: int = 150,
            separators: List[str] = None,
            length_function=len,
            is_separator_regex: bool = False
        ):
            self.chunk_size = chunk_size
            self.chunk_overlap = chunk_overlap
            self.separators = separators or ["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""]
            self.length_function = length_function

        def split_text(self, text: str) -> List[str]:
            final_chunks = []
            if not text:
                return final_chunks

            separator = ""
            for s in self.separators:
                if s == "":
                    separator = ""
                    break
                if s in text:
                    separator = s
                    break

            splits = text.split(separator) if separator else list(text)

            good_splits = []
            for s in splits:
                if self.length_function(s) < self.chunk_size:
                    good_splits.append(s)
                else:
                    # Recursive split with deeper separators
                    next_separators = self.separators[self.separators.index(separator)+1:] if separator in self.separators else []
                    sub_splitter = RecursiveCharacterTextSplitter(
                        chunk_size=self.chunk_size,
                        chunk_overlap=self.chunk_overlap,
                        separators=next_separators or ["\n", " ", ""],
                        length_function=self.length_function
                    )
                    good_splits.extend(sub_splitter.split_text(s))

            # Merge with overlap
            current_chunk = []
            current_len = 0
            for piece in good_splits:
                piece_len = self.length_function(piece)
                sep_len = self.length_function(separator) if current_chunk else 0
                if current_len + sep_len + piece_len <= self.chunk_size:
                    current_chunk.append(piece)
                    current_len += sep_len + piece_len
                else:
                    if current_chunk:
                        final_chunks.append(separator.join(current_chunk))
                    
                    # Compute overlap backwards
                    while current_chunk and current_len > self.chunk_overlap:
                        popped = current_chunk.pop(0)
                        current_len -= self.length_function(popped) + self.length_function(separator)

                    current_chunk.append(piece)
                    current_len += (self.length_function(separator) if len(current_chunk) > 1 else 0) + piece_len

            if current_chunk:
                final_chunks.append(separator.join(current_chunk))

            return final_chunks


DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 150
SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""]


def get_text_splitter(
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> RecursiveCharacterTextSplitter:
    """
    Constructs a tuned RecursiveCharacterTextSplitter:
    - Prioritizes paragraph boundaries (\n\n) to preserve topical coherence.
    - Falls back to sentence boundaries (. , ? , ! ) to avoid splitting thoughts.
    - Maintains a controlled overlap to avoid losing context across chunk boundaries.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=SEPARATORS,
        length_function=len,
        is_separator_regex=False
    )


def chunk_document_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """
    Splits multi-page document text into discrete traceable chunks.
    Each chunk records:
    - chunk_id: Unique string identifier (e.g., 'doc_page1_chunk0')
    - text: The extracted chunk content
    - metadata: Source filename, page number, char offset, token estimate
    """
    splitter = get_text_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    all_chunks = []
    global_chunk_counter = 0

    for page_idx, page in enumerate(pages):
        page_text = page["text"]
        page_num = page["page_number"]
        doc_metadata = page.get("metadata", {})
        source_name = doc_metadata.get("source", "document")

        raw_splits = splitter.split_text(page_text)
        
        current_offset = 0
        for local_idx, split_content in enumerate(raw_splits):
            # Locate approximate character start
            start_pos = page_text.find(split_content[:50], current_offset)
            if start_pos == -1:
                start_pos = current_offset
            end_pos = start_pos + len(split_content)
            current_offset = max(start_pos + 1, current_offset)

            # Approximate token count (roughly 4 characters per token)
            estimated_tokens = max(1, len(split_content) // 4)

            chunk_id = f"{source_name}_p{page_num}_c{local_idx}"
            
            all_chunks.append({
                "chunk_id": chunk_id,
                "global_index": global_chunk_counter,
                "text": split_content,
                "page_number": page_num,
                "char_start": start_pos,
                "char_end": end_pos,
                "token_count": estimated_tokens,
                "source": source_name,
                "metadata": {
                    **doc_metadata,
                    "chunk_id": chunk_id,
                    "local_chunk_index": local_idx,
                    "global_chunk_index": global_chunk_counter,
                    "chunk_size": len(split_content),
                    "estimated_tokens": estimated_tokens
                }
            })
            global_chunk_counter += 1

    return all_chunks
