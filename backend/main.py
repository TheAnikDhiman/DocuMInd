from fastapi import FastAPI
from app.api.routes.chat import router as chat_router
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.documents import router as document_router

from app.db.database import engine
from app.models.base import Base

# IMPORTANT: Import all models before create_all()
from app.models.document import Document

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DocuMind API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(
    document_router,
    prefix="/documents",
    tags=["Documents"],
)


@app.get("/")
def root():
    return {
        "message": "DocuMind API Running 🚀"
    }
app.include_router(
    chat_router,
    prefix="/chat",
    tags=["Chat"],
)