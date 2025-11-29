import os
import hashlib
import shutil
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.rag_pipeline import get_rag_chain, ingest_into_vectorstore, get_vectorstore
from core.ingestion import load_and_split_document, extract_zip_file, is_supported_file, SUPPORTED_EXTENSIONS
from core.models import EvidenceMetadata
from utils.session_handler import (
    get_all_sessions,
    create_new_session,
    load_session,
    save_session,
    add_message_to_session,
    add_file_to_session,
    file_exists_in_session,
)
from config.settings import settings

# Ensure upload directory exists
UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Pydantic Models for API ---

class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []


class SessionCreate(BaseModel):
    title: str = "New Investigation"


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    messages: List[dict] = []
    files: List[str] = []


class MessageResponse(BaseModel):
    role: str
    content: str


# --- Lifespan for startup/shutdown ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🔬 NEXUS Forensic Analysis Backend Starting...")
    print(f"📁 Upload directory: {UPLOAD_DIR}")
    print(f"🗄️ ChromaDB path: {settings.CHROMA_DB_PATH}")
    yield
    # Shutdown
    print("🔬 NEXUS Backend Shutting Down...")


# --- FastAPI App ---

app = FastAPI(
    title="NEXUS - Digital Forensics RAG API",
    description="AI-powered digital forensics analysis backend using RAG",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helper Functions ---

def compute_file_hash(file_path: str) -> str:
    """Compute SHA256 hash of a file for chain of custody."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


# --- API Endpoints ---

@app.get("/")
async def root():
    return {
        "message": "NEXUS Digital Forensics RAG API",
        "status": "operational",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# --- Session Management ---

@app.get("/sessions", response_model=List[SessionResponse])
async def list_sessions():
    """Get all investigation sessions."""
    sessions = get_all_sessions()
    return sessions


@app.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate):
    """Create a new investigation session."""
    session_id = create_new_session(session_data.title)
    session = load_session(session_id)
    return session


@app.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get a specific session with all messages and files."""
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.put("/sessions/{session_id}")
async def update_session(session_id: str, session_data: SessionCreate):
    """Update session title."""
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    save_session(session_id, {"title": session_data.title})
    return {"message": "Session updated", "session_id": session_id}


# --- Evidence Upload & Ingestion ---

@app.post("/sessions/{session_id}/upload")
async def upload_evidence(
    session_id: str,
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None)
):
    """
    Upload forensic evidence file(s) and ingest into vector store.
    Supports:
    - Single files: PDF, DOCX, PPTX, TXT, CSV, JSON, LOG
    - ZIP archives: Will be extracted and all supported files processed
    """
    # Validate session exists
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    # Allowed extensions (including zip)
    allowed_extensions = SUPPORTED_EXTENSIONS + [".zip"]
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save file to disk
    session_upload_dir = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_upload_dir, exist_ok=True)
    
    file_path = os.path.join(session_upload_dir, file.filename)
    
    try:
        # Read and save file
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Check if it's a ZIP file
        if file_ext == ".zip":
            return await process_zip_upload(
                session_id=session_id,
                zip_path=file_path,
                session_upload_dir=session_upload_dir,
                case_id=case_id
            )
        else:
            # Process single file
            return await process_single_file(
                session_id=session_id,
                file_path=file_path,
                file_content=file_content,
                file_ext=file_ext,
                filename=file.filename,
                case_id=case_id
            )
        
    except Exception as e:
        # Clean up on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


async def process_single_file(
    session_id: str,
    file_path: str,
    file_content: bytes,
    file_ext: str,
    filename: str,
    case_id: Optional[str]
):
    """Process a single evidence file."""
    # Compute hash for chain of custody
    file_hash = compute_file_hash(file_path)
    
    # Check if file already exists (by hash or filename)
    existing = file_exists_in_session(session_id, file_hash=file_hash, filename=filename)
    if existing["exists"]:
        # Clean up the uploaded file since it's a duplicate
        if os.path.exists(file_path):
            os.remove(file_path)
        return {
            "message": "File already exists in this session",
            "filename": filename,
            "existing_filename": existing["filename"],
            "matched_by": existing["matched_by"],
            "skipped": True,
            "session_id": session_id
        }
    
    # Create metadata
    metadata = EvidenceMetadata(
        filename=filename,
        file_hash=file_hash,
        file_type=file_ext,
        case_id=case_id or session_id
    )
    
    # Load and split document
    chunks = load_and_split_document(file_path, metadata)
    
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract content from file")
    
    # Ingest into vector store
    ingest_into_vectorstore(session_id, chunks)
    
    # Store file reference in session
    add_file_to_session(
        session_id=session_id,
        filename=filename,
        file_content=file_content,
        file_hash=file_hash,
        file_type=file_ext
    )
    
    return {
        "message": "Evidence uploaded and processed successfully",
        "filename": filename,
        "file_hash": file_hash,
        "chunks_created": len(chunks),
        "session_id": session_id
    }


async def process_zip_upload(
    session_id: str,
    zip_path: str,
    session_upload_dir: str,
    case_id: Optional[str]
):
    """
    Process a ZIP file containing multiple evidence files.
    Extracts all supported files and ingests them into the vector store.
    """
    results = {
        "message": "ZIP archive processed",
        "session_id": session_id,
        "zip_filename": os.path.basename(zip_path),
        "files_processed": [],
        "files_skipped": [],
        "files_duplicate": [],
        "total_chunks": 0,
        "errors": []
    }
    
    try:
        # Extract ZIP to session directory
        extract_dir = os.path.join(session_upload_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        
        # Extract all supported files
        extracted_files = extract_zip_file(zip_path, extract_dir)
        
        if not extracted_files:
            raise HTTPException(
                status_code=400, 
                detail="No supported files found in ZIP archive. Supported: " + ", ".join(SUPPORTED_EXTENSIONS)
            )
        
        # Process each extracted file
        for extracted_path in extracted_files:
            filename = os.path.basename(extracted_path)
            file_ext = os.path.splitext(filename)[1].lower()
            
            try:
                # Read file content
                with open(extracted_path, "rb") as f:
                    file_content = f.read()
                
                # Compute hash
                file_hash = compute_file_hash(extracted_path)
                
                # Check for duplicates before processing
                existing = file_exists_in_session(session_id, file_hash=file_hash, filename=filename)
                if existing["exists"]:
                    results["files_duplicate"].append({
                        "filename": filename,
                        "existing_filename": existing["filename"],
                        "matched_by": existing["matched_by"]
                    })
                    print(f"Skipping duplicate file: {filename} (matched by {existing['matched_by']})")
                    continue
                
                # Create metadata
                metadata = EvidenceMetadata(
                    filename=filename,
                    file_hash=file_hash,
                    file_type=file_ext,
                    case_id=case_id or session_id
                )
                
                # Load and split document
                chunks = load_and_split_document(extracted_path, metadata)
                
                if chunks:
                    # Ingest into vector store
                    ingest_into_vectorstore(session_id, chunks)
                    
                    # Store file reference
                    add_file_to_session(
                        session_id=session_id,
                        filename=filename,
                        file_content=file_content,
                        file_hash=file_hash,
                        file_type=file_ext
                    )
                    
                    results["files_processed"].append({
                        "filename": filename,
                        "file_hash": file_hash,
                        "chunks": len(chunks)
                    })
                    results["total_chunks"] += len(chunks)
                else:
                    results["files_skipped"].append({
                        "filename": filename,
                        "reason": "No content extracted"
                    })
                    
            except Exception as e:
                results["errors"].append({
                    "filename": filename,
                    "error": str(e)
                })
                print(f"Error processing {filename}: {e}")
        
        # Clean up: optionally remove extracted files (keep them for reference)
        # shutil.rmtree(extract_dir)
        
        # Remove the original ZIP file to save space
        if os.path.exists(zip_path):
            os.remove(zip_path)
        
        results["message"] = f"Successfully processed {len(results['files_processed'])} files from ZIP archive"
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing ZIP file: {str(e)}")


@app.get("/sessions/{session_id}/files")
async def list_session_files(session_id: str):
    """List all files uploaded to a session."""
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"session_id": session_id, "files": session.get("files", [])}


# --- RAG Chat ---

@app.post("/chat", response_model=ChatResponse)
async def chat_with_evidence(request: ChatRequest):
    """
    Send a message to the AI forensic analyst.
    The AI will use RAG to answer based on uploaded evidence.
    """
    session = load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if there's any evidence in the vector store
    vectorstore = get_vectorstore(request.session_id)
    
    try:
        # Get RAG chain for this session
        qa_chain = get_rag_chain(request.session_id)
        
        # Run the query
        result = qa_chain.invoke({"query": request.message})
        
        # Extract response and sources
        response_text = result.get("result", "I couldn't generate a response.")
        source_docs = result.get("source_documents", [])
        
        # Get unique source filenames
        sources = list(set([
            doc.metadata.get("filename", "Unknown") 
            for doc in source_docs
        ]))
        
        # Save messages to session
        add_message_to_session(request.session_id, "user", request.message)
        add_message_to_session(request.session_id, "assistant", response_text)
        
        return ChatResponse(response=response_text, sources=sources)
        
    except Exception as e:
        # If no documents in vector store, return helpful message
        error_msg = str(e)
        if "no documents" in error_msg.lower() or "empty" in error_msg.lower():
            return ChatResponse(
                response="No evidence files have been uploaded yet. Please upload forensic documents (PDF, DOCX, PPTX) to begin analysis.",
                sources=[]
            )
        raise HTTPException(status_code=500, detail=f"Error during analysis: {error_msg}")


@app.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(session_id: str):
    """Get all messages from a session."""
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session.get("messages", [])


# --- Utility Endpoints ---

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all associated data."""
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete uploaded files
    session_upload_dir = os.path.join(UPLOAD_DIR, session_id)
    if os.path.exists(session_upload_dir):
        shutil.rmtree(session_upload_dir)
    
    # Note: You may want to add session deletion from SQLite and ChromaDB
    # For now, returning success
    return {"message": "Session deleted", "session_id": session_id}


@app.get("/sessions/{session_id}/search")
async def search_evidence(session_id: str, query: str, k: int = 5):
    """
    Search the vector store for relevant evidence chunks.
    Useful for exploring what evidence is available.
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        vectorstore = get_vectorstore(session_id)
        results = vectorstore.similarity_search(query, k=k)
        
        return {
            "query": query,
            "results": [
                {
                    "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                    "metadata": doc.metadata
                }
                for doc in results
            ]
        }
    except Exception as e:
        return {"query": query, "results": [], "error": str(e)}


# --- Run with Uvicorn ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
