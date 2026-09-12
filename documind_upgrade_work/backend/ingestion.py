"""
DocuMind Ingestion Pipeline
Handles PDF, DOCX, and TXT ingestion, text extraction, cleaning, and preprocessing.
"""

import io
import re
from typing import List, Dict, Any

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from docx import Document
except ImportError:
    Document = None


def clean_text(text: str) -> str:
    """
    Cleans raw extracted text:
    - Normalizes multiple spaces and newlines while preserving paragraph breaks.
    - Strips non-printable characters.
    - Preserves semantic punctuation.
    """
    if not text:
        return ""
    # Normalize Windows and Mac line breaks
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace non-breaking spaces and tabs
    text = text.replace("\xa0", " ").replace("\t", " ")
    # Normalize 3+ consecutive line breaks into standard double line break
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove redundant trailing spaces per line
    text = "\n".join(line.strip() for line in text.split("\n"))
    # Remove control characters except standard whitespace
    text = "".join(ch for ch in text if ch.isprintable() or ch in "\n\t")
    return text.strip()


def extract_from_txt(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Extracts text from a plain text file."""
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1", errors="replace")
    
    cleaned = clean_text(text)
    return [{
        "text": cleaned,
        "page_number": 1,
        "metadata": {
            "source": filename,
            "page": 1,
            "format": "txt"
        }
    }]


def extract_from_pdf(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Extracts text page-by-page from a PDF file."""
    if PdfReader is None:
        # Fallback raw text heuristic
        cleaned = clean_text(re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', file_bytes.decode('latin-1', errors='ignore')))
        return [{"text": cleaned or "[PDF binary uploaded]", "page_number": 1, "metadata": {"source": filename, "page": 1, "format": "pdf"}}]

    reader = PdfReader(io.BytesIO(file_bytes))
    pages_data = []
    
    for idx, page in enumerate(reader.pages):
        raw_text = page.extract_text() or ""
        cleaned = clean_text(raw_text)
        if cleaned:
            pages_data.append({
                "text": cleaned,
                "page_number": idx + 1,
                "metadata": {
                    "source": filename,
                    "page": idx + 1,
                    "total_pages": len(reader.pages),
                    "format": "pdf"
                }
            })
            
    # Fallback if empty
    if not pages_data:
        pages_data.append({
            "text": "[Empty or unscannable PDF document]",
            "page_number": 1,
            "metadata": {"source": filename, "page": 1, "format": "pdf"}
        })
        
    return pages_data


def extract_from_docx(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Extracts text from a Microsoft Word (.docx) document."""
    if Document is None:
        cleaned = clean_text(re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', file_bytes.decode('latin-1', errors='ignore')))
        return [{"text": cleaned or "[DOCX binary uploaded]", "page_number": 1, "metadata": {"source": filename, "page": 1, "format": "docx"}}]

    doc = Document(io.BytesIO(file_bytes))
    full_paragraphs = []
    
    for para in doc.paragraphs:
        if para.text and para.text.strip():
            full_paragraphs.append(para.text.strip())
            
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                full_paragraphs.append(row_text)

    combined = "\n\n".join(full_paragraphs)
    cleaned = clean_text(combined)
    
    return [{
        "text": cleaned,
        "page_number": 1,
        "metadata": {
            "source": filename,
            "page": 1,
            "format": "docx"
        }
    }]


def ingest_document(filename: str, file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Dispatcher for document ingestion based on file extension.
    Returns a list of page/section dictionaries with cleaned text and metadata.
    """
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        return extract_from_pdf(file_bytes, filename)
    elif lower_name.endswith(".docx"):
        return extract_from_docx(file_bytes, filename)
    elif lower_name.endswith(".txt") or lower_name.endswith(".md"):
        return extract_from_txt(file_bytes, filename)
    else:
        # Default attempt as text
        return extract_from_txt(file_bytes, filename)
