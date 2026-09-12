"""
DocuMind RAG Engine & Hallucination Mitigation System
Includes 5+ prompt template variants, query classification, citation enforcement, and Gemini API grounding.
"""

import os
from typing import List, Dict, Any, Tuple, Optional, AsyncIterator
import json
import re


PROMPT_TEMPLATES = {
    "factual": """You are DocuMind, an enterprise Document Intelligence System answering factual inquiries.
Answer the user's question directly and concisely, drawing STRICTLY from the provided context.
Do not guess, assume, or extrapolate beyond the explicit text.
Every factual claim MUST be followed by an exact citation in the format: [Doc: <source>, Chunk: <chunk_id>, Page: <page_number>].
If the provided context does not contain enough information to answer the question, you must respond with:
"Not found in document. The provided document sections do not contain information regarding [topic]."

Context Chunks:
{context}

User Question:
{query}

Grounded Factual Answer:""",

    "summarization": """You are DocuMind, an enterprise Document Intelligence System performing synthesis and summarization.
Synthesize the key points, themes, and executive insights from the provided context.
Structure your response into:
1. Executive Summary
2. Key Findings & Takeaways
3. Critical Nuances or Limitations

Every section and key takeaway must cite the exact chunk(s) it originates from using [Doc: <source>, Chunk: <chunk_id>, Page: <page_number>].
If the retrieved context lacks relevant information to summarize the topic, output:
"Not found in document. The context does not provide sufficient material on [topic]."

Context Chunks:
{context}

Summarization Focus / Prompt:
{query}

Grounded Summary:""",

    "comparison": """You are DocuMind, an enterprise Document Intelligence System performing comparative analysis.
Perform an objective, side-by-side comparison of the entities, concepts, metrics, or policies mentioned in the query based ONLY on the provided context.
Organize your comparison by:
- Feature / Attribute Dimension
- Detailed similarities and differences
- Final comparative assessment

Strict Grounding Rule: Compare only what is explicitly verified in the chunks. If one entity is mentioned but another is absent from the text, explicitly state that data for the missing entity is "Not found in document".
Cite all points with [Doc: <source>, Chunk: <chunk_id>, Page: <page_number>].

Context Chunks:
{context}

Comparative Query:
{query}

Grounded Comparative Analysis:""",

    "data_extraction": """You are DocuMind, an enterprise Document Intelligence System specialized in structured data extraction.
Extract all relevant data points, metrics, dates, personnel, figures, and specifications related to the user's query.
Format the output as clean markdown tables or structured bullet points with explicit key-value fields.
Strict Rule: Do NOT infer or approximate numbers. If a field or metric is not present in the chunks, denote it as "Not found in document".
Attach citation tag [Doc: <source>, Chunk: <chunk_id>, Page: <page_number>] to every extracted data field.

Context Chunks:
{context}

Extraction Target:
{query}

Structured Extraction:""",

    "multi_hop": """You are DocuMind, an enterprise Document Intelligence System performing multi-step associative reasoning.
The user's query requires synthesizing disjoint facts from multiple chunks across pages or documents.
Break down your reasoning step-by-step:
Step 1: Identify foundational premise A from the text (cite chunk).
Step 2: Connect with intermediate observation B from the text (cite chunk).
Step 3: Derive the concluding synthesis strictly supported by Steps 1 and 2.

Do not introduce external premises. If any step of the reasoning chain cannot be grounded in the context, state:
"Not found in document: Could not verify complete chain for [specific link]."
Cite every step using [Doc: <source>, Chunk: <chunk_id>, Page: <page_number>].

Context Chunks:
{context}

Multi-Hop Question:
{query}

Step-by-Step Grounded Reasoning:"""
}


def detect_query_type(query: str) -> str:
    """
    Intelligently classifies user query into one of the 5 prompt template types:
    factual, summarization, comparison, data_extraction, or multi_hop.
    """
    q = query.lower()
    
    # Comparison triggers
    if any(k in q for k in ["compare", "vs", "versus", "difference between", "similarities", "contrasted", "pros and cons"]):
        return "comparison"
        
    # Summarization triggers
    if any(k in q for k in ["summarize", "summary", "overview", "synopsis", "key takeaways", "recap", "tl;dr", "brief"]):
        return "summarization"
        
    # Data extraction triggers
    if any(k in q for k in ["extract", "table", "list all", "metrics", "dates", "numbers", "percentages", "structured data", "values"]):
        return "data_extraction"
        
    # Multi-hop / reasoning triggers
    if any(k in q for k in ["how does", "why did", "chain of events", "relationship between", "cause", "consequence", "impact of"]):
        return "multi_hop"
        
    # Default is factual Q&A
    return "factual"


def format_context_block(chunks: List[Dict[str, Any]]) -> str:
    """
    Formats retrieved chunks into a standardized context block with clear chunk headers.
    """
    if not chunks:
        return "[No matching document chunks found in index.]"
        
    formatted = []
    for idx, c in enumerate(chunks):
        cid = c.get("chunk_id", f"chunk_{idx}")
        source = c.get("source", "document")
        page = c.get("page_number", 1)
        score = c.get("score", 0.0)
        text = c.get("text", "").strip()
        
        block = f"--- [CHUNK {idx+1}] ID: {cid} | Source: {source} | Page: {page} | Score: {score:.3f} ---\n{text}\n"
        formatted.append(block)
        
    return "\n".join(formatted)


def build_rag_prompt(query: str, chunks: List[Dict[str, Any]], template_type: Optional[str] = None) -> Tuple[str, str]:
    """
    Constructs the final grounded prompt for Gemini API.
    Returns (prompt_text, selected_template_name).
    """
    if not template_type or template_type == "auto" or template_type not in PROMPT_TEMPLATES:
        template_type = detect_query_type(query)
        
    template = PROMPT_TEMPLATES[template_type]
    context_str = format_context_block(chunks)
    prompt = template.format(context=context_str, query=query)
    
    return prompt, template_type
