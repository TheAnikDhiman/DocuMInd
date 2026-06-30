from fastapi import Depends
from sqlalchemy.orm import Session
from app.services.parser_service import extract_text
from app.services.chunk_service import chunk_text
from app.services.embedding_service import create_vector_store

from app.vectorstore import store
from app.db.database import get_db
from app.models.document import Document

from pathlib import Path
import shutil
import uuid

from fastapi import APIRouter
from fastapi import File
from fastapi import UploadFile

router = APIRouter()

UPLOAD_DIR = Path("app/storage/documents")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Get file extension
    extension = Path(file.filename).suffix

    # Generate unique filename
    stored_filename = f"{uuid.uuid4()}{extension}"

    # Save path
    destination = UPLOAD_DIR / stored_filename

    # Save file locally
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create database object
    document = Document(
        filename=file.filename,
        stored_filename=stored_filename,
        file_path=str(destination),
        file_type=file.content_type,
        file_size=destination.stat().st_size,
    )

    # Save to PostgreSQL
    db.add(document)
    db.commit()
    db.refresh(document)
    # --------- Build RAG Pipeline ---------

    text = extract_text(str(destination))

    chunks = chunk_text(text)

    index, stored_chunks = create_vector_store(chunks)

    store.index = index
    store.chunks = stored_chunks
    return {
        "id": str(document.id),
        "filename": document.filename,
        "stored_filename": document.stored_filename,
        "file_size": document.file_size,
    }
@router.get("/")
def get_documents(
    db: Session = Depends(get_db),
):
    documents = db.query(Document).all()

    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "stored_filename": doc.stored_filename,
            "file_type": doc.file_type,
            "uploaded_at": doc.uploaded_at,
        }
        for doc in documents
    ]