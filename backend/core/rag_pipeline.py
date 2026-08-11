from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_ollama import OllamaEmbeddings
from langchain_classic.retrievers import MultiQueryRetriever
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import BaseOutputParser, StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.documents import Document
from config.settings import settings
from typing import List
import re
import logging

logging.basicConfig()
logging.getLogger("langchain.retrievers.multi_query").setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

FORENSICS_PROMPT_TEMPLATE = """You are CaseGPT, a Senior Digital Forensics Examiner and Legal Evidence Analyst.
Your sole function is to analyze the Evidence Context below and answer the Investigator Query precisely.

═══════════════════════════════════════════
HARD RULES — violation of any rule invalidates the report
═══════════════════════════════════════════
1. EVIDENCE ONLY — Every single claim must exist verbatim or explicitly in the Evidence Context.
   No inference. No assumption. No world knowledge. If it is not written, it does not exist.

2. CITE EVERY CLAIM — After every factual statement write (src: filename.pdf) using the
   exact filename from the nearest [SOURCE: filename] tag above that fact.

3. STRICT "NOT FOUND" RULE — If the answer is absent from the Evidence Context, output:
   "This information is not found in the provided evidence."
   • NEVER say data is "redacted" — you cannot know why it is absent.
   • NEVER say data is "unavailable" or give a reason for its absence.
   • NEVER fill gaps with plausible-sounding details.

4. NO SELF-CONTRADICTION — Before writing the Gaps section, re-read your Key Findings.
   Do NOT list something as a gap if you already answered it above.

5. ARTIFACTS MUST BE EXPLICIT — Only list an artifact if its exact value appears in the
   Evidence Context. Do not name artifact types without values (e.g. no "Payment method | Unknown").

═══════════════════════════════════════════
OUTPUT — use this structure exactly, no additions
═══════════════════════════════════════════

### Summary
2-4 sentences. Answer the query directly in clear, plain language. Cite every claim.

### Timeline
List events as bullets in chronological order.
Format each item: "- **[Date / Time]** — [Event] (src: filename)".
Use exact dates/times from evidence.
If no timestamps exist: write "No timestamps found in evidence."

### Key Findings
List findings as bullets.
Format each item: "- **[Finding]:** [Short explanation] (src: filename)".
Do not repeat the same fact across bullets.

### Artifacts
List artifacts as bullets.
Format each item: "- **[Type]:** [Value] (src: filename)".
Explicit artifacts only — IPs, hashes, usernames, device IDs, account names, file paths, dates.
If none found: "No specific artifacts identified."

### Evidence Gaps
Only list information that the query requires but the evidence does not contain.
Format: "• [What is missing] — not found in any ingested document."
If the query is fully answered: write "No gaps — query fully answered by evidence."

═══════════════════════════════════════════
Evidence Context:
{context}

Investigator Query: {question}
═══════════════════════════════════════════
Forensic Report:"""

# Separate prompt used ONLY during retrieval to generate alternative queries.
# Never shown to the user — runs silently before the main chain.
MULTI_QUERY_PROMPT = PromptTemplate(
    input_variables=["question"],
    template="""You are a digital forensics investigator assistant.
Generate 4 different versions of the given query to improve vector database retrieval.

Approach each version differently:
- Rephrase using different keywords
- Break into sub-questions if complex
- Use formal legal/forensic terminology
- Use plain descriptive language

Return ONLY the 4 queries, one per line. No numbering, bullets, or extra text.

Original query: {question}

Alternative queries:"""
)


# ---------------------------------------------------------------------------
# Output parsers
# ---------------------------------------------------------------------------

class LineListOutputParser(BaseOutputParser[List[str]]):
    """Parses multi-query LLM output into a clean list of query strings."""

    def parse(self, text: str) -> List[str]:
        lines = text.strip().split("\n")
        return [line.strip() for line in lines if line.strip()]


# ---------------------------------------------------------------------------
# Context formatter
# ---------------------------------------------------------------------------

def format_chunks_with_source(docs: List[Document]) -> str:
    """
    Wraps each retrieved chunk with [SOURCE] tags so the LLM knows
    exactly which file each piece of evidence came from.

    The LLM sees:
        [SOURCE: detectivereport3.pdf | chunk 2]
        Detectives Friday and Gannon met with McGoo at M57 Patents...
        [END SOURCE: detectivereport3.pdf]

    This eliminates wrong citations — the filename is literally in the
    context text, not just in metadata the LLM never sees.
    """
    if not docs:
        return "NO EVIDENCE RETRIEVED — the session may be empty or the query " \
               "did not match any ingested documents."

    formatted = []
    seen_content = set()  # deduplicate identical chunks from multi-query overlap

    for doc in docs:
        # Skip exact duplicate chunks (MultiQueryRetriever can return them)
        content_hash = hash(doc.page_content.strip())
        if content_hash in seen_content:
            continue
        seen_content.add(content_hash)

        filename    = doc.metadata.get("filename",    "unknown_file")
        chunk_index = doc.metadata.get("chunk_index", "?")
        total       = doc.metadata.get("total_chunks", "?")

        formatted.append(
            f"[SOURCE: {filename} | chunk {chunk_index}/{total}]\n"
            f"{doc.page_content.strip()}\n"
            f"[END SOURCE: {filename}]"
        )

    return "\n\n---\n\n".join(formatted)


# ---------------------------------------------------------------------------
# Vectorstore helpers
# ---------------------------------------------------------------------------

def sanitize_collection_name(session_id: str) -> str:
    """ChromaDB collection names must be alphanumeric, underscores, or dashes."""
    clean = re.sub(r"[^a-zA-Z0-9_-]", "_", session_id)
    if not clean[0].isalnum():
        clean = "case_" + clean
    return clean[:63]  # Chroma hard limit


def get_vectorstore(session_id: str) -> Chroma:
    embeddings = OllamaEmbeddings(
        model="nomic-embed-text",
        base_url=settings.OLLAMA_BASE_URL
    )
    return Chroma(
        persist_directory=settings.CHROMA_DB_PATH,
        embedding_function=embeddings,
        collection_name=sanitize_collection_name(session_id)
    )


def ingest_into_vectorstore(session_id: str, chunks: List[Document]) -> None:
    """Add pre-processed document chunks into the session's Chroma collection."""
    if not chunks:
        print("[INGEST] No chunks to ingest.")
        return
    vectorstore = get_vectorstore(session_id)
    vectorstore.add_documents(chunks)
    print(f"[INGEST] Added {len(chunks)} chunks to collection '{sanitize_collection_name(session_id)}'")


# ---------------------------------------------------------------------------
# RAG chain
# ---------------------------------------------------------------------------

def get_rag_chain(session_id: str):
    """
    Builds and returns the full RAG chain for a session.

    Retrieval flow:
        User question
            → MultiQueryRetriever generates 4 rephrasings + original (5 total)
            → Each runs through MMR base retriever (k=4, fetch_k=8)
            → Results deduplicated and merged  (~20 unique chunks max)
            → format_chunks_with_source wraps each chunk in [SOURCE] tags
            → Tagged context + original question fed into FORENSICS_PROMPT
            → LLM generates structured forensic report citing exact filenames

    Returns a LangChain Runnable. Call with:
        chain.invoke("your question here")
    """
    llm = ChatGroq(
        model_name="llama-3.3-70b-versatile",
        temperature=0,              # no creative gap-filling
        api_key=settings.GROQ_API_KEY
    )

    vectorstore = get_vectorstore(session_id)

    # Base retriever — MMR for diversity within each query
    base_retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k":           4,    # top chunks per query
            "fetch_k":     8,    # MMR candidate pool per query
            "lambda_mult": 0.5   # 0=max diversity, 1=max relevance
        }
    )

    # MultiQueryRetriever — generates alternative queries to improve recall
    retriever = MultiQueryRetriever(
        retriever=base_retriever,
        llm_chain=MULTI_QUERY_PROMPT | llm | LineListOutputParser(),
        include_original=True       # always run the original query too
    )

    prompt = PromptTemplate(
        template=FORENSICS_PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )

    # ------------------------------------------------------------------
    # Retrieval validation
    #
    # If the retriever returns nothing (empty session, wrong collection,
    # query mismatch) we surface a clear message instead of letting the
    # LLM hallucinate an entire answer from memory.
    # ------------------------------------------------------------------
    def retrieve_and_format(inputs: dict) -> dict:
        # main.py sends {"query": "..."}
        if isinstance(inputs, dict):
            question = inputs.get("query", inputs.get("question", str(inputs)))
        else:
            question = str(inputs)

        docs = retriever.invoke(question)

        if not docs:
            print(f"[RAG] Warning: no chunks retrieved for query: '{question}'")
            return {
                "context":  "NO EVIDENCE FOUND. The session appears to be empty "
                            "or no ingested documents matched this query.",
                "question": question,
                "source_documents": []
            }

        context = format_chunks_with_source(docs)
        print(f"[RAG] Retrieved {len(docs)} chunks from {len(set(d.metadata.get('filename','?') for d in docs))} file(s)")
        return {
            "context": context, 
            "question": question,
            "source_documents": docs
        }

    # ------------------------------------------------------------------
    # Final chain
    #
    # Using a custom LCEL chain instead of RetrievalQA so we can inject
    # the [SOURCE]-tagged context rather than raw chunk text.
    # We output a dictionary {"result": ..., "source_documents": ...} 
    # to maintain compatibility with main.py.
    # ------------------------------------------------------------------
    chain = (
        RunnableLambda(retrieve_and_format)
        | {
            "result": prompt | llm | StrOutputParser(),
            "source_documents": lambda x: x["source_documents"]
        }
    )

    return chain