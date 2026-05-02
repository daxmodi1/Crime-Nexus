"""
User Profiling Module - Extracts entities and relationships from documents
Uses LLMGraphTransformer with documents directly from ingestion.py loaders.
Includes entity-level anomaly scoring computed alongside graph extraction.
"""

import os
import json
import traceback
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from config.settings import settings


@dataclass
class EntityAnomaly:
    """Anomaly assessment for a single entity"""
    score: int = 0                                      # 0-100
    severity: str = "normal"                             # normal | low | moderate | high | critical
    triggered_flags: List[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "severity": self.severity,
            "triggered_flags": self.triggered_flags,
            "summary": self.summary,
        }


@dataclass
class Entity:
    """Represents an entity in the knowledge graph"""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    anomaly: Optional[EntityAnomaly] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "description": self.description or "",
            "properties": self.properties or {},
            "anomaly": self.anomaly.to_dict() if self.anomaly else EntityAnomaly().to_dict(),
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
    
    # Entity types relevant to digital forensics - MEDIUM SCALE
    ALLOWED_NODES = [
        "Person", "Organization", "Location", "Event",
        "Vehicle", "Weapon", "Document", "Phone", "Account"
    ]
    
    # Relationship types for forensic analysis - MEDIUM SCALE
    ALLOWED_RELATIONSHIPS = [
        "KNOWS", "WORKS_FOR", "LIVES_AT", "OWNS", "CONTACTED",
        "SENT_TO", "RECEIVED_FROM", "INVOLVED_IN", "LOCATED_AT", 
        "ASSOCIATED_WITH", "PARTICIPATED_IN"
    ]
    
    # ---- Anomaly scoring prompt sent AFTER graph extraction ----
    ANOMALY_SCORING_PROMPT = """You are a forensic intelligence analyst. You have been given:
1. A list of entities (with type, name, description) extracted from criminal-investigation documents.
2. The relationships each entity participates in.

Your task: assign an **anomaly_score** (0-100) to EVERY entity and provide concise justification.

### Scoring Bases — apply ALL that are relevant

**Universal (all entity types):**
- Cross-document frequency: appears suspiciously too often OR is conspicuously absent where expected
- Role inconsistency: entity plays contradictory roles (e.g. witness AND suspect)
- Association risk: connected to other suspicious / high-anomaly entities
- Context mismatch: entity appears where its presence is logically unexpected
- Information asymmetry: entity is referenced frequently but details about it are vague or withheld

**Person:**
- Multiple aliases or name variations
- Appears as both victim and perpetrator
- Unexplained presence at multiple crime scenes / events
- Communicates with conflicting parties simultaneously
- Central connector between otherwise unrelated clusters

**Organization:**
- Shell-like characteristics (no clear purpose described)
- Linked to multiple unrelated individuals or crimes
- Sudden appearance / disappearance in the timeline
- Inconsistent described role (charity vs. financial conduit)

**Location:**
- Nexus point connecting unrelated people / events
- Described differently across documents
- Unusually high frequency in crime-related context

**Event:**
- Timeline contradictions
- Described very differently across documents
- Involves an unusually high number of suspicious entities

**Vehicle:**
- Associated with multiple unrelated persons
- Appears at geographically / temporally impossible locations
- Ownership conflicts

**Weapon:**
- Transfer-chain gaps
- Appears in unrelated incidents
- Conflicting attributes across documents

**Document / Evidence:**
- Contradicts other documents significantly
- Referenced but never described (suppressed / hidden)
- Single-source yet claimed to be widely known

**Phone / Email:**
- High-volume communication with flagged entities
- Used by multiple different persons
- Activity during suspicious time windows
- Burner-like pattern (appears briefly, disappears)

**Account / Money:**
- Unusual transaction patterns (round numbers, rapid transfers)
- Linked to multiple unrelated persons
- Large amounts with no justification

**Device:**
- Used by multiple persons
- Associated with data deletion or tampering
- Appears at multiple locations simultaneously

### Severity scale
  0-20  → normal
  21-40 → low
  41-60 → moderate
  61-80 → high
  81-100 → critical

### IMPORTANT GUIDELINES
- A obviously suspicious entity (killer, primary suspect, key weapon) should score HIGH, not low.
- Do NOT penalize entities merely for being mentioned often if the context justifies it.
- Base your judgment on the *pattern* of associations and inconsistencies, not just raw counts.
- Provide 2-4 specific, concise reasons in triggered_flags.
- Write a 1-2 sentence summary explaining the score.

### Input
Entities:
{entities_json}

Relationships:
{relationships_json}

### Output — return ONLY valid JSON, no markdown fences:
[
  {{
    "entity_id": "<entity id>",
    "anomaly_score": <int 0-100>,
    "severity": "<normal|low|moderate|high|critical>",
    "triggered_flags": ["reason 1", "reason 2"],
    "summary": "<1-2 sentence justification>"
  }}
]
"""

    def __init__(self):
        """Initialize the profiling engine with LLM"""
        self.llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            temperature=0,
            api_key=settings.GROQ_API_KEY,
            max_retries=3
        )
        self.graph_transformer = LLMGraphTransformer(
            llm=self.llm,
            allowed_nodes=self.ALLOWED_NODES,
            allowed_relationships=self.ALLOWED_RELATIONSHIPS,
            node_properties=["description"],
            relationship_properties=["description"],
            strict_mode=True
        )
    
    # ---------- anomaly scoring (post graph-extraction) ----------

    def _score_entities(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
    ) -> Dict[str, EntityAnomaly]:
        """
        Send the already-extracted nodes + edges to the LLM for anomaly scoring.
        Returns a mapping of entity_id → EntityAnomaly.
        No raw documents are sent — only the lightweight graph summary.
        """
        if not nodes:
            return {}

        # Build compact JSON representations for the prompt
        entities_summary = [
            {
                "entity_id": n["id"],
                "name": n["name"],
                "type": n["type"],
                "description": n.get("description", ""),
            }
            for n in nodes
        ]
        relationships_summary = [
            {
                "source": e["source"],
                "target": e["target"],
                "relationship": e["relationship"],
            }
            for e in edges
        ]

        prompt = self.ANOMALY_SCORING_PROMPT.format(
            entities_json=json.dumps(entities_summary, indent=2),
            relationships_json=json.dumps(relationships_summary, indent=2),
        )

        try:
            print(f"[UserProfiling] Scoring anomalies for {len(nodes)} entities...")
            response = self.llm.invoke(prompt)
            raw = response.content.strip()

            # Strip markdown fences if the LLM wrapped them anyway
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw.rsplit("```", 1)[0]
            raw = raw.strip()

            scored: List[Dict] = json.loads(raw)

            result: Dict[str, EntityAnomaly] = {}
            for item in scored:
                eid = item.get("entity_id", "")
                result[eid] = EntityAnomaly(
                    score=max(0, min(100, int(item.get("anomaly_score", 0)))),
                    severity=item.get("severity", "normal"),
                    triggered_flags=item.get("triggered_flags", []),
                    summary=item.get("summary", ""),
                )

            print(f"[UserProfiling] Anomaly scoring complete for {len(result)} entities")
            return result

        except Exception as e:
            print(f"[UserProfiling] Anomaly scoring failed: {e}")
            traceback.print_exc()
            return {}

    # ---------- main extraction pipeline ----------

    def extract_from_documents(self, documents: List[Document]) -> Dict[str, Any]:
        """
        Extract entities and relationships from LangChain Documents,
        then score each entity for anomalies — all in one pipeline call.

        Args:
            documents: List of LangChain Document objects from ingestion loaders

        Returns:
            Dictionary with nodes (including anomaly data) and edges
        """
        if not documents:
            return {"nodes": [], "edges": [], "message": "No documents provided"}

        all_nodes: List[Dict[str, Any]] = []
        all_edges: List[Dict[str, Any]] = []
        node_id_map: Dict[str, bool] = {}

        try:
            print(f"[UserProfiling] Processing {len(documents)} documents for entity extraction...")

            # --- Step 1: Graph extraction (existing) ---
            graph_docs = self.graph_transformer.convert_to_graph_documents(documents)
            print(f"[UserProfiling] Extracted {len(graph_docs)} graph documents")

            for graph_doc in graph_docs:
                for node in graph_doc.nodes:
                    node_id = f"{node.type}_{node.id}".lower().replace(" ", "_")
                    if node_id not in node_id_map:
                        node_id_map[node_id] = True
                        entity = Entity(
                            id=node_id,
                            name=node.id,
                            type=node.type.lower(),
                            description=(
                                node.properties.get("description", "") if node.properties else ""
                            ),
                            properties=node.properties or {},
                        )
                        all_nodes.append(entity.to_dict())

                for rel in graph_doc.relationships:
                    source_id = f"{rel.source.type}_{rel.source.id}".lower().replace(" ", "_")
                    target_id = f"{rel.target.type}_{rel.target.id}".lower().replace(" ", "_")
                    relationship = Relationship(
                        source_id=source_id,
                        target_id=target_id,
                        relationship_type=rel.type,
                        properties=(
                            rel.properties if hasattr(rel, "properties") and rel.properties else {}
                        ),
                    )
                    all_edges.append(relationship.to_dict())

            # Deduplicate edges
            unique_edges: List[Dict[str, Any]] = []
            edge_set: set = set()
            for edge in all_edges:
                edge_key = (edge["source"], edge["target"], edge["relationship"])
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    unique_edges.append(edge)

            # --- Step 2: Anomaly scoring (new) — uses graph data only ---
            anomaly_map = self._score_entities(all_nodes, unique_edges)

            # Merge anomaly data back into node dicts
            for node in all_nodes:
                anomaly = anomaly_map.get(node["id"])
                if anomaly:
                    node["anomaly"] = anomaly.to_dict()
                else:
                    node["anomaly"] = EntityAnomaly().to_dict()

            print(
                f"[UserProfiling] Final result: {len(all_nodes)} nodes, "
                f"{len(unique_edges)} edges (with anomaly scores)"
            )

            return {
                "nodes": all_nodes,
                "edges": unique_edges,
                "total_nodes": len(all_nodes),
                "total_edges": len(unique_edges),
            }

        except Exception as e:
            print(f"[UserProfiling] Error extracting entities: {e}")
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
        content = doc.page_content.strip()
        if not content:
            continue
        # Truncate very long documents
        if len(content) > 12000:
            doc.page_content = content[:12000]
        processed_docs.append(doc)
    
    if not processed_docs:
        return {"nodes": [], "edges": [], "message": "No valid document content found"}
    
    print(f"[UserProfiling] Processing {len(processed_docs)} documents for session {session_id}")
    
    engine = get_profiling_engine()
    return engine.extract_from_documents(processed_docs)
