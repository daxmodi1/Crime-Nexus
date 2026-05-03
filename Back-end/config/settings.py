import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    CHROMA_DB_PATH: str = "./chroma_db"
    GOOGLE_API_KEY: str = ""  # Optional, only needed if using Google embeddings
    OLLAMA_BASE_URL: str = "http://localhost:11434"  # Ollama API endpoint
    TAVILY_API_KEY: str = "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" # Optional, for deep web research

    # Forensic Settings - Optimized for better retrieval
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RETRIEVAL: int = 7  # Retrieve more docs for better recall

    class Config:
        env_file = ".env"

# Create a global settings object
settings = Settings()