import os
from dotenv import load_dotenv

# Load .env before any other modules read environment variables
_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=_ENV_PATH, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import classify, rag, documents, pipeline
from app.rag.indexer import indexer
from app.rag.vector_store import vector_store
from app.rag.embeddings import embedding_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
  print("[FastAPI AI Service] Starting up...")
  # Pre-load embedding model so queries respond instantly
  embedding_manager._load_model()
  indexed_count = indexer.index_all_documents()
  print(f"[FastAPI AI Service] Ready. Indexed {indexed_count} verified civic knowledge chunks in FAISS.")
  yield
  print("[FastAPI AI Service] Shutting down...")

app = FastAPI(
  title="RaiseIt AI Service",
  description="AI Issue Classification & RAG-Powered Civic Assistant Service",
  version="1.0.0",
  lifespan=lifespan
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/health")
def health_check():
  return {
    "status": "online",
    "service": "RaiseIt AI & RAG Service",
    "knowledgeBaseChunks": len(vector_store.chunks)
  }

# Mount internal endpoints
app.include_router(classify.router)
app.include_router(rag.router)
app.include_router(documents.router)
app.include_router(pipeline.router)

if __name__ == "__main__":
  import uvicorn
  uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
