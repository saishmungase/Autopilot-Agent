"""
Sales Playbook Router
---------------------
Allows admins to upload documents (PDF, DOCX, TXT, MD) which are:
  1. Parsed into text chunks
  2. Embedded via Gemini text-embedding-004
  3. Stored in Qdrant vector database

Also exposes a search endpoint so the AI agent can retrieve relevant
playbook context at query time.
"""

import io
import os
import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from pydantic import BaseModel

log = logging.getLogger(__name__)

router = APIRouter(prefix="/playbook", tags=["Sales Playbook"])

# ---------------------------------------------------------------------------
# Lazy imports — only fail at request time if deps are missing
# ---------------------------------------------------------------------------

def _get_qdrant():
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams, PointStruct
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="qdrant-client not installed. Run: pip install qdrant-client",
        )

    url = os.getenv("QDRANT_URL", "").strip()
    api_key = os.getenv("QDRANT_API_KEY", "").strip() or None
    host = os.getenv("QDRANT_HOST", "localhost").strip()
    port = int(os.getenv("QDRANT_PORT", "6333").strip())

    if url:
        # Qdrant Cloud — use URL + API key
        client = QdrantClient(url=url, api_key=api_key)
        log.debug(f"Qdrant: connecting to cloud at {url}")
    else:
        # Local / self-hosted
        client = QdrantClient(host=host, port=port, api_key=api_key)
        log.debug(f"Qdrant: connecting to {host}:{port}")

    return client, QdrantClient, Distance, VectorParams, PointStruct


COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "sales_playbook")
EMBEDDING_DIM = 3072         # gemini-embedding-001 default output dimension
CHUNK_SIZE = 800             # characters per chunk
CHUNK_OVERLAP = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_collection(client, Distance, VectorParams):
    """Create the Qdrant collection if it doesn't exist yet."""
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        log.info(f"Created Qdrant collection '{COLLECTION_NAME}'")


def _chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunks.append(text[start:end].strip())
        start += size - overlap
    return [c for c in chunks if c]


def _extract_text(filename: str, content: bytes) -> str:
    """Extract plain text from PDF, DOCX, TXT, or MD."""
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="pypdf not installed. Run: pip install pypdf",
            )

    if ext == "docx":
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="python-docx not installed. Run: pip install python-docx",
            )

    if ext in ("txt", "md"):
        return content.decode("utf-8", errors="replace")

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported file type '.{ext}'. Supported: pdf, docx, txt, md",
    )


def _embed(texts: List[str]) -> List[List[float]]:
    """Embed a list of strings using Gemini gemini-embedding-001."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)

    embeddings = []
    # Embed one at a time — batch embed_content with a list returns a single
    # averaged vector in some SDK versions; loop is safer and still fast enough.
    for text in texts:
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text,
            task_type="retrieval_document",
        )
        embeddings.append(result["embedding"])
    return embeddings


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DocumentMeta(BaseModel):
    doc_id: str
    filename: str
    title: str
    chunk_count: int
    uploaded_at: str


class SearchResult(BaseModel):
    doc_id: str
    filename: str
    title: str
    chunk: str
    score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=DocumentMeta, summary="Upload a playbook document")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
):
    """
    Upload a PDF, DOCX, TXT, or MD file.
    The document is chunked, embedded, and stored in Qdrant.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    # Extract text
    text = _extract_text(file.filename or "upload.txt", content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the file")

    # Chunk
    chunks = _chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="No text chunks produced")

    # Embed
    vectors = _embed(chunks)

    # Store in Qdrant
    client, _, Distance, VectorParams, PointStruct = _get_qdrant()
    _ensure_collection(client, Distance, VectorParams)

    doc_id = str(uuid.uuid4())
    from datetime import datetime, timezone
    uploaded_at = datetime.now(timezone.utc).isoformat()

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vectors[i],
            payload={
                "doc_id": doc_id,
                "filename": file.filename,
                "title": title,
                "chunk_index": i,
                "chunk": chunks[i],
                "uploaded_at": uploaded_at,
            },
        )
        for i in range(len(chunks))
    ]

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    log.info(f"Uploaded '{title}' ({len(chunks)} chunks) → Qdrant collection '{COLLECTION_NAME}'")

    return DocumentMeta(
        doc_id=doc_id,
        filename=file.filename or "",
        title=title,
        chunk_count=len(chunks),
        uploaded_at=uploaded_at,
    )


@router.get("/documents", summary="List all uploaded documents")
def list_documents():
    """
    Return a deduplicated list of all documents stored in Qdrant.
    """
    client, _, Distance, VectorParams, PointStruct = _get_qdrant()
    _ensure_collection(client, Distance, VectorParams)

    # Scroll through all points and collect unique doc metadata
    seen: dict = {}
    offset = None

    while True:
        result, next_offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=250,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        for point in result:
            p = point.payload or {}
            doc_id = p.get("doc_id", "")
            if doc_id and doc_id not in seen:
                seen[doc_id] = {
                    "doc_id": doc_id,
                    "filename": p.get("filename", ""),
                    "title": p.get("title", ""),
                    "uploaded_at": p.get("uploaded_at", ""),
                }
        if next_offset is None:
            break
        offset = next_offset

    docs = sorted(seen.values(), key=lambda d: d["uploaded_at"], reverse=True)
    return {"documents": docs, "total": len(docs)}


@router.delete("/documents/{doc_id}", summary="Delete a document and all its chunks")
def delete_document(doc_id: str):
    """
    Delete all Qdrant points belonging to a given doc_id.
    """
    from qdrant_client.models import Filter, FieldCondition, MatchValue

    client, _, Distance, VectorParams, PointStruct = _get_qdrant()
    _ensure_collection(client, Distance, VectorParams)

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
        ),
    )
    log.info(f"Deleted document '{doc_id}' from Qdrant")
    return {"status": "deleted", "doc_id": doc_id}


@router.get("/search", response_model=SearchResponse, summary="Semantic search across playbook")
def search_playbook(
    q: str = Query(..., description="Search query"),
    top_k: int = Query(5, ge=1, le=20),
):
    """
    Embed the query and return the top-k most relevant playbook chunks.
    """
    client, _, Distance, VectorParams, PointStruct = _get_qdrant()
    _ensure_collection(client, Distance, VectorParams)

    query_vector = _embed([q])[0]

    hits = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=top_k,
        with_payload=True,
    )

    results = [
        SearchResult(
            doc_id=h.payload.get("doc_id", ""),
            filename=h.payload.get("filename", ""),
            title=h.payload.get("title", ""),
            chunk=h.payload.get("chunk", ""),
            score=round(h.score, 4),
        )
        for h in hits
    ]

    return SearchResponse(query=q, results=results)
