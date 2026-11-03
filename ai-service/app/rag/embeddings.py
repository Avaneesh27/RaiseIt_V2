import os
import numpy as np
from typing import List
from sentence_transformers import SentenceTransformer

class EmbeddingManager:
  """
  Manages semantic embedding generation using all-MiniLM-L6-v2 (384-dimensional dense vectors).
  Vectors are L2-normalized for cosine similarity calculations.
  """
  _instance = None

  def __new__(cls):
    if cls._instance is None:
      cls._instance = super(EmbeddingManager, cls).__new__(cls)
      cls._instance.model = None
    return cls._instance

  def _load_model(self):
    if self.model is None:
      print("[EmbeddingManager] Loading SentenceTransformer 'all-MiniLM-L6-v2'...")
      try:
        # Fast local loading from cached HuggingFace weights without network delay
        self.model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        print("[EmbeddingManager] Local model loaded successfully.")
      except Exception as local_err:
        print(f"[EmbeddingManager] Local load notice: {local_err}. Falling back to default loader...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[EmbeddingManager] Model loaded successfully.")

  def embed_texts(self, texts: List[str]) -> np.ndarray:
    self._load_model()
    embeddings = self.model.encode(
      texts,
      batch_size=32,
      show_progress_bar=False,
      convert_to_numpy=True,
      normalize_embeddings=True
    )
    return embeddings.astype(np.float32)

  def embed_query(self, query: str) -> np.ndarray:
    self._load_model()
    embedding = self.model.encode(
      [query],
      convert_to_numpy=True,
      normalize_embeddings=True
    )
    return embedding[0].astype(np.float32)

embedding_manager = EmbeddingManager()
