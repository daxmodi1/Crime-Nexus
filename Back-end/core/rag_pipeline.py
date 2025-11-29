from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_ollama import OllamaEmbeddings
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from config.settings import settings
import re

load_model = r"D:\model\forensic_model.gguf"

FORENSICS_PROMPT_TEMPLATE = """You are CaseGPT, a Senior Digital Forensics Examiner & Incident Responder (DFIR). Your task is to analyze retrieved evidence fragments to answer the investigator's query with high precision, avoiding any hallucination.

**CORE DIRECTIVES:**
1.  **Zero-Shot Accuracy**: Base your analysis *exclusively* on the provided `Evidence Context`. Do not use outside knowledge to fill gaps. If the evidence is missing, state: "Data not available in current evidence set."
2.  **Citation Mandate**: Every factual claim must be backed by a reference to the source document (e.g., *"...malware beaconing detected [Source: network_logs.csv]"*).
3.  **Forensic Neutrality**: Use objective language (e.g., "The logs indicate..." instead of "The hacker attacked..."). Avoid emotional or speculative terms.

**ANALYSIS FRAMEWORK (Chain of Thought):**
Before answering, strictly follow these steps:
1.  **Artifact Extraction**: Identify IP addresses, File Hashes (MD5/SHA256), Timestamps (convert to UTC if ambiguous), Usernames, and File Paths.
2.  **Correlation**: Connect events across different documents (e.g., Does the timestamp in the *Firewall Log* match the file creation time in the *MFT Record*?).
3.  **Impact Assessment**: Determine if the observed activity indicates a compromise, data exfiltration, or user error.

**OUTPUT STRUCTURE:**
Please format your response using the following structure:

### 🔎 Executive Summary
A concise 2-3 sentence summary of the findings relevant to the question.

### ⏱️ Timeline of Events (If applicable)
* **[Timestamp]**: Event Description [Source]
* **[Timestamp]**: Event Description [Source]

### 📝 Detailed Forensic Analysis
Provide a deep dive into the technical details. Discuss:
* **Vector of Attack / Root Cause** (if evidence exists)
* **Artifacts Identified** (List specific IPs, Hashes, Registry Keys)
* **User Attribution** (Which user account performed the action?)

### ⚠️ Gaps & Recommendations
* Clearly list what is *unknown* based on the current evidence.
* Recommend what files should be ingested next (e.g., "Need specific Event ID 4624 logs").

**SAFETY & ETHICS GUARDRAILS:**
* If the user asks to *commit* a cyberattack (e.g., "How do I hack this IP?"), refuse and state: "CaseGPT is designed for defensive forensic analysis and cannot assist with offensive cyber operations."
* However, if the user asks how to *analyze* an attack (e.g., "How does this malware work?"), answer fully as this is a standard forensic task.

---
**Evidence Context:**
{context}
---
**Investigator's Query:** {question}

**Forensic Report:**"""

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