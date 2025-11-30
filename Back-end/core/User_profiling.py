"""
User Profiling Module - Extracts entities and relationships from documents
Uses LLMGraphTransformer with documents directly from ingestion.py loaders
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from config.settings import settings


@dataclass
class Entity:
    """Represents an entity in the knowledge graph"""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "description": self.description or "",
            "properties": self.properties or {}
        }


@dataclass  
class Relationship:
    """Represents a relationship between entities"""
    source_id: str
    target_id: str
    relationship_type: str
    properties: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> dict:
        return {
            "source": self.source_id,
            "target": self.target_id,
            "relationship": self.relationship_type,
            "properties": self.properties or {}
        }


class UserProfilingEngine:
    """Engine for extracting entities and relationships from documents"""
    
    # Entity types relevant to digital forensics
    ALLOWED_NODES = [
        "Person", "Organization", "Location", "Event", 
        "Vehicle", "Weapon", "Document", "Evidence",
        "Phone", "Email", "Account", "Device", "Date", "Money"
    ]
    
    # Relationship types for forensic analysis
    ALLOWED_RELATIONSHIPS = [
        "KNOWS", "WORKS_FOR", "LIVES_AT", "OWNS", "CONTACTED",
        "SENT_TO", "RECEIVED_FROM", "PRESENT_AT", "WITNESSED",
        "INVOLVED_IN", "RELATED_TO", "ASSOCIATED_WITH",
        "COMMUNICATED_WITH", "TRANSFERRED_TO", "LOCATED_AT"
    ]
    
    def __init__(self):
        """Initialize the profiling engine with LLM"""
        self.llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            temperature=0,
            api_key=settings.GROQ_API_KEY
        )
        self.graph_transformer = LLMGraphTransformer(
            llm=self.llm,
            allowed_nodes=self.ALLOWED_NODES,
            allowed_relationships=self.ALLOWED_RELATIONSHIPS,
            node_properties=["description"],
            relationship_properties=["description"]
        )
    
    def extract_from_documents(self, documents: List[Document]) -> Dict[str, Any]:
        """
        Extract entities and relationships from LangChain Documents
        (directly from ingestion.py loaders - NOT from ChromaDB)
        
        Args:
            documents: List of LangChain Document objects from ingestion loaders
            
        Returns:
            Dictionary with nodes and edges
        """
        if not documents:
            return {"nodes": [], "edges": [], "message": "No documents provided"}
        
        all_nodes = []
        all_edges = []
        node_id_map = {}  # To track and merge duplicate nodes
        
        try:
            print(f"[UserProfiling] Processing {len(documents)} documents for entity extraction...")
            
            # Pass all documents directly to LLMGraphTransformer
            graph_docs = self.graph_transformer.convert_to_graph_documents(documents)
            
            print(f"[UserProfiling] Extracted {len(graph_docs)} graph documents")
            
            for graph_doc in graph_docs:
                # Process nodes
                for node in graph_doc.nodes:
                    node_id = f"{node.type}_{node.id}".lower().replace(" ", "_")
                    
                    if node_id not in node_id_map:
                        node_id_map[node_id] = True
                        entity = Entity(
                            id=node_id,
                            name=node.id,
                            type=node.type.lower(),
                            description=node.properties.get("description", "") if node.properties else "",
                            properties=node.properties or {}
                        )
                        all_nodes.append(entity.to_dict())
                
                # Process relationships
                for rel in graph_doc.relationships:
                    source_id = f"{rel.source.type}_{rel.source.id}".lower().replace(" ", "_")
                    target_id = f"{rel.target.type}_{rel.target.id}".lower().replace(" ", "_")
                    
                    relationship = Relationship(
                        source_id=source_id,
                        target_id=target_id,
                        relationship_type=rel.type,
                        properties=rel.properties if hasattr(rel, 'properties') and rel.properties else {}
                    )
                    all_edges.append(relationship.to_dict())
            
            # Remove duplicate edges
            unique_edges = []
            edge_set = set()
            for edge in all_edges:
                edge_key = (edge["source"], edge["target"], edge["relationship"])
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    unique_edges.append(edge)
            
            print(f"[UserProfiling] Final result: {len(all_nodes)} nodes, {len(unique_edges)} edges")
            
            return {
                "nodes": all_nodes,
                "edges": unique_edges,
                "total_nodes": len(all_nodes),
                "total_edges": len(unique_edges)
            }
            
        except Exception as e:
            print(f"[UserProfiling] Error extracting entities: {e}")
            import traceback
            traceback.print_exc()
            return {"nodes": [], "edges": [], "error": str(e)}


# Singleton instance
_profiling_engine: Optional[UserProfilingEngine] = None


def get_profiling_engine() -> UserProfilingEngine:
    """Get or create the profiling engine singleton"""
    global _profiling_engine
    if _profiling_engine is None:
        _profiling_engine = UserProfilingEngine()
    return _profiling_engine


def load_documents_for_graph(file_path: str) -> List[Document]:
    """
    Load a document for graph extraction using ingestion.py loaders.
    Returns full documents (not chunked) for graph extraction.
    
    Args:
        file_path: Path to the file
        
    Returns:
        List of LangChain Document objects
    """
    from core.ingestion import (
        SafeDocLoader, SafeDocxLoader, SafePptxLoader, 
        SafePptLoader, SafeRtfLoader, TextFileLoader,
        SUPPORTED_EXTENSIONS
    )
    from langchain_community.document_loaders import PyPDFLoader
    
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext not in SUPPORTED_EXTENSIONS:
        print(f"[UserProfiling] Unsupported file type: {ext}")
        return []
    
    try:
        loader = None
        
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
        elif ext == ".docx":
            loader = SafeDocxLoader(file_path)
        elif ext == ".doc":
            loader = SafeDocLoader(file_path)
        elif ext == ".pptx":
            loader = SafePptxLoader(file_path)
        elif ext == ".ppt":
            loader = SafePptLoader(file_path)
        elif ext == ".rtf":
            loader = SafeRtfLoader(file_path)
        elif ext in [".txt", ".csv", ".json", ".log"]:
            loader = TextFileLoader(file_path)
        else:
            return []
        
        docs = loader.load()
        print(f"[UserProfiling] Loaded {len(docs)} documents from {os.path.basename(file_path)}")
        return docs
        
    except Exception as e:
        print(f"[UserProfiling] Error loading {file_path}: {e}")
        return []


def extract_graph_from_session_files(session_id: str, upload_dir: str) -> Dict[str, Any]:
    """
    Extract entities from all files in a session using the ingestion loaders.
    This uses the same document loaders as ingestion.py, NOT ChromaDB embeddings.
    
    Args:
        session_id: The session ID
        upload_dir: Base path to the uploads directory
        
    Returns:
        Graph data with nodes and edges
    """
    session_upload_dir = os.path.join(upload_dir, session_id)
    
    if not os.path.exists(session_upload_dir):
        return {"nodes": [], "edges": [], "message": "No upload directory found"}
    
    all_documents = []
    
    # Load all files from the session upload directory AND subdirectories (like 'extracted')
    for root, dirs, files in os.walk(session_upload_dir):
        for filename in files:
            file_path = os.path.join(root, filename)
            if os.path.isfile(file_path):
                docs = load_documents_for_graph(file_path)
                all_documents.extend(docs)
                print(f"[UserProfiling] Found file: {file_path}, loaded {len(docs)} docs")
    
    if not all_documents:
        return {"nodes": [], "edges": [], "message": "No documents could be loaded"}
    
    # Limit content size per document to avoid token limits
    processed_docs = []
    for doc in all_documents:
        if len(doc.page_content) > 15000:
            # Truncate very long documents
            doc.page_content = doc.page_content[:15000]
        if doc.page_content.strip():  # Only include non-empty docs
            processed_docs.append(doc)
    
    print(f"[UserProfiling] Processing {len(processed_docs)} documents for session {session_id}")
    
    engine = get_profiling_engine()
    return engine.extract_from_documents(processed_docs)
