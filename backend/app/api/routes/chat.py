from fastapi import APIRouter
from pydantic import BaseModel

from app.vectorstore import store
from app.services.embedding_service import search
from app.services.rag_service import ask_gemini

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


@router.post("/")
def chat(request: ChatRequest):

    if store.index is None:
        return {
            "error": "Upload a document first."
        }

    context = search(
        store.index,
        store.chunks,
        request.question,
    )

    answer = ask_gemini(
        context,
        request.question,
    )

    return {
    "answer": answer,
    "retrieved_chunks": len(context),
    "preview": [
        chunk[:150] + "..."
        for chunk in context
    ]
}