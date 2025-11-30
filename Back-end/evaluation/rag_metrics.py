"""
RAG System Evaluation Metrics
Run this script to calculate retrieval and generation metrics
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.rag_pipeline import get_vectorstore
from config.settings import settings
import json

# Sample evaluation queries with expected relevant documents
# You should customize these based on your M57 dataset
EVAL_QUERIES = [
    {
        "query": "Who is the main suspect in the case?",
        "relevant_docs": ["detectivereport1.doc", "m57-affidavit-warrant-final.pdf"],
        "expected_entities": ["Jean", "Pat McGoo"]
    },
    {
        "query": "What evidence was found on the computer?",
        "relevant_docs": ["detectivereport2.doc", "detectivereport3.pdf"],
        "expected_entities": ["email", "files", "documents"]
    },
    {
        "query": "What is the timeline of events?",
        "relevant_docs": ["detectivereport1.doc", "detectivereport4.pdf"],
        "expected_entities": ["date", "time"]
    },
    {
        "query": "What organizations are involved?",
        "relevant_docs": ["m57-affidavit-warrant-final.pdf"],
        "expected_entities": ["M57", "company"]
    },
    {
        "query": "What digital artifacts were recovered?",
        "relevant_docs": ["detectivereport3.pdf", "detectivereport4.pdf"],
        "expected_entities": ["IP", "hash", "file"]
    }
]


def calculate_precision_at_k(retrieved_docs: list, relevant_docs: list, k: int = 5) -> float:
    """
    Precision@K = (# of relevant docs in top-K) / K
    """
    retrieved_sources = [doc.metadata.get("source", "") for doc in retrieved_docs[:k]]
    
    relevant_count = 0
    for source in retrieved_sources:
        for rel_doc in relevant_docs:
            if rel_doc.lower() in source.lower():
                relevant_count += 1
                break
    
    return relevant_count / k if k > 0 else 0


def calculate_recall_at_k(retrieved_docs: list, relevant_docs: list, k: int = 5) -> float:
    """
    Recall@K = (# of relevant docs in top-K) / (total # of relevant docs)
    """
    retrieved_sources = [doc.metadata.get("source", "") for doc in retrieved_docs[:k]]
    
    found_relevant = 0
    for rel_doc in relevant_docs:
        for source in retrieved_sources:
            if rel_doc.lower() in source.lower():
                found_relevant += 1
                break
    
    return found_relevant / len(relevant_docs) if relevant_docs else 0


def calculate_mrr(retrieved_docs: list, relevant_docs: list) -> float:
    """
    Mean Reciprocal Rank = 1 / (rank of first relevant document)
    """
    for i, doc in enumerate(retrieved_docs):
        source = doc.metadata.get("source", "")
        for rel_doc in relevant_docs:
            if rel_doc.lower() in source.lower():
                return 1.0 / (i + 1)
    return 0.0


def calculate_context_relevance(retrieved_docs: list, expected_entities: list) -> float:
    """
    Context Relevance = % of expected entities found in retrieved context
    """
    all_content = " ".join([doc.page_content.lower() for doc in retrieved_docs])
    
    found_entities = 0
    for entity in expected_entities:
        if entity.lower() in all_content:
            found_entities += 1
    
    return (found_entities / len(expected_entities)) * 100 if expected_entities else 0


def evaluate_rag_system(session_id: str):
    """
    Run full evaluation on the RAG system
    """
    print("=" * 60)
    print("RAG SYSTEM EVALUATION")
    print("=" * 60)
    
    try:
        vectorstore = get_vectorstore(session_id)
    except Exception as e:
        print(f"Error: Could not load vectorstore for session {session_id}")
        print(f"Details: {e}")
        return
    
    # Check if vectorstore has documents
    try:
        collection = vectorstore._collection
        doc_count = collection.count()
        print(f"\nSession: {session_id}")
        print(f"Documents in vectorstore: {doc_count}")
        
        if doc_count == 0:
            print("ERROR: No documents in vectorstore. Please ingest documents first.")
            return
    except Exception as e:
        print(f"Warning: Could not get document count: {e}")
    
    all_precision = []
    all_recall = []
    all_mrr = []
    all_context_relevance = []
    
    print("\n" + "-" * 60)
    print("QUERY-BY-QUERY RESULTS")
    print("-" * 60)
    
    for i, eval_item in enumerate(EVAL_QUERIES):
        query = eval_item["query"]
        relevant_docs = eval_item["relevant_docs"]
        expected_entities = eval_item["expected_entities"]
        
        print(f"\nQuery {i+1}: {query}")
        
        # Retrieve documents
        try:
            retrieved_docs = vectorstore.similarity_search(query, k=5)
        except Exception as e:
            print(f"  Error retrieving: {e}")
            continue
        
        # Calculate metrics
        precision = calculate_precision_at_k(retrieved_docs, relevant_docs, k=5)
        recall = calculate_recall_at_k(retrieved_docs, relevant_docs, k=5)
        mrr = calculate_mrr(retrieved_docs, relevant_docs)
        context_rel = calculate_context_relevance(retrieved_docs, expected_entities)
        
        all_precision.append(precision)
        all_recall.append(recall)
        all_mrr.append(mrr)
        all_context_relevance.append(context_rel)
        
        print(f"  Retrieved: {[doc.metadata.get('source', 'unknown')[:30] for doc in retrieved_docs]}")
        print(f"  Precision@5: {precision:.2%}")
        print(f"  Recall@5: {recall:.2%}")
        print(f"  MRR: {mrr:.3f}")
        print(f"  Context Relevance: {context_rel:.1f}/100")
    
    # Calculate averages
    print("\n" + "=" * 60)
    print("AGGREGATE METRICS")
    print("=" * 60)
    
    avg_precision = sum(all_precision) / len(all_precision) if all_precision else 0
    avg_recall = sum(all_recall) / len(all_recall) if all_recall else 0
    avg_mrr = sum(all_mrr) / len(all_mrr) if all_mrr else 0
    avg_context_rel = sum(all_context_relevance) / len(all_context_relevance) if all_context_relevance else 0
    
    print(f"""
┌────────────────────────────────────────────┐
│         RAG EVALUATION RESULTS             │
├────────────────────────────────────────────┤
│  Top-5 Retrieval Precision    {avg_precision*100:>6.2f}%     │
│  Top-5 Retrieval Recall       {avg_recall*100:>6.2f}%     │
│  Mean Reciprocal Rank (MRR)   {avg_mrr:>6.3f}      │
│  Context Relevance Score      {avg_context_rel:>6.1f}/100   │
└────────────────────────────────────────────┘
""")
    
    # Save results to file
    results = {
        "session_id": session_id,
        "metrics": {
            "precision_at_5": round(avg_precision * 100, 2),
            "recall_at_5": round(avg_recall * 100, 2),
            "mrr": round(avg_mrr, 3),
            "context_relevance": round(avg_context_rel, 1)
        },
        "per_query_results": [
            {
                "query": EVAL_QUERIES[i]["query"],
                "precision": round(all_precision[i] * 100, 2) if i < len(all_precision) else 0,
                "recall": round(all_recall[i] * 100, 2) if i < len(all_recall) else 0,
                "mrr": round(all_mrr[i], 3) if i < len(all_mrr) else 0,
                "context_relevance": round(all_context_relevance[i], 1) if i < len(all_context_relevance) else 0
            }
            for i in range(len(EVAL_QUERIES))
        ]
    }
    
    with open("evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("Results saved to evaluation_results.json")
    
    return results


if __name__ == "__main__":
    # Replace with your actual session ID
    SESSION_ID = "case_8197b9dc"  # Change this to your session
    
    if len(sys.argv) > 1:
        SESSION_ID = sys.argv[1]
    
    print(f"Evaluating session: {SESSION_ID}")
    evaluate_rag_system(SESSION_ID)
