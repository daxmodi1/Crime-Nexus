from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_ollama import OllamaEmbeddings
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from config.settings import settings
import re

load_model = r"D:\model\forensic_model.gguf"

FORENSICS_PROMPT_TEMPLATE = """You are **CaseGPT**, a Senior Digital Forensics Examiner & Incident Responder (DFIR). Analyze the retrieved evidence to answer the investigator's query with precision.

## CORE RULES
1. Base analysis **only** on the provided Evidence Context — no outside knowledge.
2. Every claim must cite the source document.
3. Use neutral, objective language.

## OUTPUT FORMAT
Structure your response exactly as shown below. Use clean markdown with proper spacing.

---

## 🔎 Executive Summary

Write 2-3 clear sentences summarizing the key findings.

---

## ⏱️ Timeline of Events

| Timestamp | Event | Source |
|-----------|-------|--------|
| YYYY-MM-DD HH:MM | Description of event | Document name |

*If timestamps are unavailable, state "Timestamps not available in evidence" and skip the table.*

---

## 📝 Forensic Analysis

### Key Findings

Describe the main discoveries in clear paragraphs.

### Artifacts Identified

| Artifact Type | Value | Source |
|--------------|-------|--------|
| IP Address | x.x.x.x | log_file.csv |
| File Hash | abc123... | report.pdf |
| Username | user123 | system_logs.txt |

*List only artifacts that exist in the evidence. If none found, state "No specific artifacts identified."*

### Attribution

Explain any user or entity attribution supported by evidence.

---

## ⚠️ Gaps & Recommendations

### Information Gaps
- List what is unknown or missing from the current evidence set

### Recommended Next Steps
- Suggest specific files or data sources to ingest next

---

## GUARDRAILS
- Refuse requests to assist with offensive cyber operations.
- Analysis of attack techniques for defensive purposes is permitted.

---

**Evidence Context:**
{context}

---

**Investigator's Query:** {question}

---

**Forensic Report:**
"""

def sanitize_collection_name(session_id: str) -> str:
    """ChromaDB collection names must be alphanumeric/underscores/dashes."""
    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id)
    if not clean_name[0].isalnum():
        clean_name = "case_" + clean_name
    return clean_name[:63]  # Chroma limit

def get_vectorstore(session_id: str):
    """
    Returns a ChromaDB instance isolated to the specific session_id.
    """
    embeddings = OllamaEmbeddings(model="nomic-embed-text:latest")
    
    collection_name = sanitize_collection_name(session_id)
    
    vectorstore = Chroma(
        persist_directory=settings.CHROMA_DB_PATH,
        embedding_function=embeddings,
        collection_name=collection_name
    )
    return vectorstore

def ingest_into_vectorstore(session_id: str, chunks):
    """Adds document chunks to the specific session's collection."""
    vectorstore = get_vectorstore(session_id)
    vectorstore.add_documents(chunks)

def get_rag_chain(session_id: str):
    """Creates a QA chain bound to the specific session's data."""
    llm = ChatGroq(
        model_name="llama-3.3-70b-versatile",
        temperature=0.5,
        api_key=settings.GROQ_API_KEY
    )
    
    vectorstore = get_vectorstore(session_id)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    prompt = PromptTemplate(
        template=FORENSICS_PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": prompt}
    )
    return qa_chain