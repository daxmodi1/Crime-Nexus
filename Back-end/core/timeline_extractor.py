"""
Timeline Extractor Module - Extracts temporal events from documents
Uses LLM to identify and structure timeline events directly from document content
"""

import os
import re
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import settings


@dataclass
class TimelineEvent:
    """Represents a single event in the timeline"""
    timestamp: str
    event: str
    type: str  # 'critical', 'warning', 'success', 'info'
    source_file: str
    actors: List[str]
    artifacts: List[str]
    confidence: str  # 'high', 'medium', 'low'
    
    def to_dict(self) -> dict:
        return asdict(self)


class TimelineExtractor:
    """Extracts timeline events from forensic documents using LLM"""
    
    EXTRACTION_PROMPT = """You are a digital forensics timeline analyst. Extract ALL temporal events from the document below.

RULES:
1. Extract EVERY event that has a date, time, or temporal reference
2. Normalize timestamps to ISO format (YYYY-MM-DD HH:MM:SS) when possible
3. If only a date is available, use format YYYY-MM-DD
4. If time is relative (e.g., "two days later"), estimate based on context
5. Identify the type of each event:
   - "critical": Security breaches, unauthorized access, data theft, crimes
   - "warning": Suspicious activity, policy violations, anomalies
   - "success": Successful operations, recoveries, positive outcomes
   - "info": General events, routine activities, observations
6. Extract actors (people, usernames, organizations involved)
7. Extract artifacts (files, IP addresses, devices, evidence items)

DOCUMENT CONTENT:
{document_content}

SOURCE FILE: {source_file}

Respond with a JSON array of events. Each event must have:
- timestamp: string (ISO format or original if cannot parse)
- event: string (clear description of what happened)
- type: string (one of: critical, warning, success, info)
- actors: array of strings (people/entities involved)
- artifacts: array of strings (digital evidence items)
- confidence: string (high, medium, low - based on how explicit the time reference is)

If no temporal events are found, return an empty array: []

JSON OUTPUT:"""

    def __init__(self):
        """Initialize the timeline extractor with LLM"""
        self.llm = ChatGroq(
            model_name="llama-3.1-8b-instant",
            temperature=0,
            api_key=settings.GROQ_API_KEY,
            max_retries=3
        )
        
    def extract_from_document(self, doc: Document, source_file: str) -> List[TimelineEvent]:
        """
        Extract timeline events from a single document
        
        Args:
            doc: LangChain Document object
            source_file: Name of the source file
            
        Returns:
            List of TimelineEvent objects
        """
        content = doc.page_content.strip()
        if not content or len(content) < 50:
            return []
        
        # Truncate very long documents
        if len(content) > 15000:
            content = content[:15000]
        
        try:
            prompt = ChatPromptTemplate.from_template(self.EXTRACTION_PROMPT)
            chain = prompt | self.llm
            
            response = chain.invoke({
                "document_content": content,
                "source_file": source_file
            })
            
            # Parse JSON response
            response_text = response.content.strip()
            
            # Try to extract JSON from response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                events_data = json.loads(json_match.group())
            else:
                # Try parsing the whole response
                events_data = json.loads(response_text)
            
            events = []
            for event_dict in events_data:
                try:
                    event = TimelineEvent(
                        timestamp=event_dict.get("timestamp", "Unknown"),
                        event=event_dict.get("event", ""),
                        type=event_dict.get("type", "info"),
                        source_file=source_file,
                        actors=event_dict.get("actors", []),
                        artifacts=event_dict.get("artifacts", []),
                        confidence=event_dict.get("confidence", "medium")
                    )
                    if event.event:  # Only add if event description exists
                        events.append(event)
                except Exception as e:
                    print(f"[Timeline] Error parsing event: {e}")
                    continue
            
            return events
            
        except json.JSONDecodeError as e:
            print(f"[Timeline] JSON parse error for {source_file}: {e}")
            return []
        except Exception as e:
            print(f"[Timeline] Error extracting from {source_file}: {e}")
            return []
    
    def extract_from_documents(self, documents: List[Document], source_files: List[str]) -> List[TimelineEvent]:
        """
        Extract timeline events from multiple documents
        
        Args:
            documents: List of LangChain Document objects
            source_files: List of source file names (same order as documents)
            
        Returns:
            Sorted list of TimelineEvent objects
        """
        all_events = []
        
        for doc, source_file in zip(documents, source_files):
            print(f"[Timeline] Processing: {source_file}")
            events = self.extract_from_document(doc, source_file)
            all_events.extend(events)
            print(f"[Timeline] Found {len(events)} events in {source_file}")
        
        # Sort events by timestamp
        all_events = self._sort_events(all_events)
        
        return all_events
    
    def _sort_events(self, events: List[TimelineEvent]) -> List[TimelineEvent]:
        """Sort events by timestamp, handling various formats"""
        def parse_timestamp(ts: str) -> datetime:
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%d",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%SZ",
                "%m/%d/%Y %H:%M:%S",
                "%m/%d/%Y %H:%M",
                "%m/%d/%Y",
                "%d/%m/%Y %H:%M:%S",
                "%d/%m/%Y",
                "%B %d, %Y",
                "%b %d, %Y",
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(ts.strip(), fmt)
                except ValueError:
                    continue
            
            # Return a far future date for unparseable timestamps
            return datetime(9999, 12, 31)
        
        return sorted(events, key=lambda e: parse_timestamp(e.timestamp))


# Singleton instance
_timeline_extractor: Optional[TimelineExtractor] = None


def get_timeline_extractor() -> TimelineExtractor:
    """Get or create the timeline extractor singleton"""
    global _timeline_extractor
    if _timeline_extractor is None:
        _timeline_extractor = TimelineExtractor()
    return _timeline_extractor


def load_documents_for_timeline(file_path: str) -> List[Document]:
    """
    Load a document for timeline extraction using ingestion.py loaders.
    
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
        print(f"[Timeline] Unsupported file type: {ext}")
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
        print(f"[Timeline] Loaded {len(docs)} documents from {os.path.basename(file_path)}")
        return docs
        
    except Exception as e:
        print(f"[Timeline] Error loading {file_path}: {e}")
        return []


def extract_timeline_from_session(session_id: str, upload_dir: str) -> Dict[str, Any]:
    """
    Extract timeline events from all files in a session.
    
    Args:
        session_id: The session ID
        upload_dir: Base path to the uploads directory
        
    Returns:
        Dictionary with timeline events and metadata
    """
    session_upload_dir = os.path.join(upload_dir, session_id)
    
    if not os.path.exists(session_upload_dir):
        return {"timeline": [], "message": "No upload directory found", "total_events": 0}
    
    all_documents = []
    source_files = []
    
    # Load all files from the session upload directory AND subdirectories
    for root, dirs, files in os.walk(session_upload_dir):
        for filename in files:
            file_path = os.path.join(root, filename)
            if os.path.isfile(file_path):
                docs = load_documents_for_timeline(file_path)
                for doc in docs:
                    all_documents.append(doc)
                    source_files.append(filename)
                print(f"[Timeline] Found file: {file_path}, loaded {len(docs)} docs")
    
    if not all_documents:
        return {"timeline": [], "message": "No documents could be loaded", "total_events": 0}
    
    print(f"[Timeline] Processing {len(all_documents)} documents for session {session_id}")
    
    extractor = get_timeline_extractor()
    events = extractor.extract_from_documents(all_documents, source_files)
    
    # Convert to dict format
    timeline = [event.to_dict() for event in events]
    
    return {
        "timeline": timeline,
        "total_events": len(timeline),
        "files_processed": len(set(source_files)),
        "message": f"Extracted {len(timeline)} events from {len(set(source_files))} files"
    }
