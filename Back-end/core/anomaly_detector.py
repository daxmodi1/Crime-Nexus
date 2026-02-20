"""
Anomaly Detector Module - Detects outliers and suspicious patterns in forensic documents.

Input strategy (uses all three existing formats):
  1. Raw document content (from file loaders, same as timeline/graph modules)
  2. Timeline events already cached in session (timestamps, actors, event types)
  3. Entity/relationship graph already cached in session (nodes, edges)

Two-level output:
  - Document-level anomaly scores (0-100) with per-category breakdown and cited flags
  - Person-level anomaly scores aggregated from documents mentioning each person
"""

import os
import re
import json
import traceback
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from config.settings import settings


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

@dataclass
class AnomalyFlag:
    """A single detected anomaly signal in a document."""
    category: str        # temporal | behavioral | content | structural | relational
    flag: str            # concise description of the anomaly
    weight: int          # 1-20 — contribution to score
    evidence_quote: str  # exact text from the document supporting this flag

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DocumentAnomaly:
    """Anomaly assessment result for one document."""
    filename: str
    anomaly_score: int          # 0-100  (= sum of 5 category scores, clamped)
    severity: str               # low | moderate | high
    flags: List[AnomalyFlag]    # empty when severity == 'low'
    summary: str
    category_scores: Dict[str, int]  # temporal/behavioral/content/structural/relational -> 0-20

    def to_dict(self) -> dict:
        return {
            "filename": self.filename,
            "anomaly_score": self.anomaly_score,
            "severity": self.severity,
            "flags": [f.to_dict() for f in self.flags],
            "summary": self.summary,
            "category_scores": self.category_scores,
        }


@dataclass
class PersonAnomaly:
    """Aggregated anomaly score for a person entity across the case documents."""
    person_id: str
    person_name: str
    anomaly_score: int          # 0-100
    severity: str               # low | moderate | high
    contributing_docs: List[str]
    top_flags: List[AnomalyFlag]

    def to_dict(self) -> dict:
        return {
            "person_id": self.person_id,
            "person_name": self.person_name,
            "anomaly_score": self.anomaly_score,
            "severity": self.severity,
            "contributing_docs": self.contributing_docs,
            "top_flags": [f.to_dict() for f in self.top_flags],
        }


# ---------------------------------------------------------------------------
# Anomaly Detector Engine
# ---------------------------------------------------------------------------

class AnomalyDetector:
    """
    Scores each forensic document on five anomaly dimensions using an LLM,
    grounded in the document's raw text, its extracted timeline events, its
    extracted graph entities, and a cross-case baseline.
    """

    DOCUMENT_ANOMALY_PROMPT = """You are a Senior Digital Forensics Anomaly Analyst with expertise in behavioral analysis, financial crime, and cyber-forensics. Score the document below for suspicious patterns by comparing it against the full case context.

## CASE BASELINE (use this as the expected normal pattern)
{case_context}

## DOCUMENT UNDER ANALYSIS
Filename: {filename}
File type: {file_type}

### Raw Document Content:
{document_content}

### Timeline Events extracted from this specific document:
{timeline_events}

### Entities & Relationships extracted from this specific document:
{entities_and_relations}

---

## SCORING INSTRUCTIONS

Score this document on **5 dimensions** (0-20 points each, total max = 100).
Be precise: only flag genuinely suspicious patterns backed by evidence from the text.

### DIMENSION 1 — Temporal Anomalies [0-20 pts]
Evidence to look for:
- Activity at unusual hours (late night 22:00–06:00, weekends, or public holidays)
- Sudden unexplained gaps in activity followed by bursts of many events
- Timestamps that are backdated, future-dated, or impossible relative to other case documents
- Events sequenced in a way that is chronologically contradictory within this document
- An improbably large number of events compressed into a very short time window

### DIMENSION 2 — Behavioral Anomalies [0-20 pts]
Evidence to look for:
- An actor performing actions inconsistent with their established role (e.g. a junior employee authorizing large financial transfers)
- A sudden and unexplained change in communication frequency, tone, writing style, or recipient list
- A first-time interaction in this document between entities who have no prior documented connection
- An escalation pattern: normal routine → secretive/cautious language → urgency → sudden silence or disappearance
- Access to resources, systems, or locations not normally associated with the actor's role

### DIMENSION 3 — Content Anomalies [0-20 pts]
Evidence to look for:
- Coded language, unusual abbreviations, deliberate vagueness, or obfuscation where specificity is expected
- High-value sensitive data (account numbers, passwords/credentials, PII, large monetary figures) appearing in an unexpected document type
- Internal contradictions within this document's own statements
- Direct contradictions with known facts from other case documents (compare against case baseline above)
- A document that appears to be a deliberate reconstruction, partial extract, or copy of another record

### DIMENSION 4 — Structural / Metadata Anomalies [0-20 pts]
Evidence to look for:
- Content that does not match the expected format for this file type (e.g., a .txt file containing structured financial tables, a log file with narrative paragraphs)
- Signs of editing artifacts: formatting inconsistencies, orphaned references, abrupt topic changes, or responses to things not present in the document
- Missing sections that should be present for this document type (e.g., a contract without parties or signatures, a report without conclusions)
- Document appears to respond to or reference an entity/event that does not appear in any other case document
- Evidence of overwriting, deletion indicators, or unusual metadata references in the text

### DIMENSION 5 — Relational Anomalies [0-20 pts]
Evidence to look for:
- Communication or transactions between parties who are described as unrelated elsewhere in the case
- Financial, physical, or digital transfers that break the established chain of custody or ownership
- Entities appearing in this document who have no documented role in the case (compare entities section above against case baseline)
- Key participants who are conspicuously absent from important events or transactions in this document
- Relationships described here that directly contradict the established knowledge graph in the case baseline

---

## OUTPUT FORMAT
Respond with ONLY a valid JSON object — no text before or after, no markdown, no explanation.

{{
  "anomaly_score": <integer 0-100 — must equal exact sum of the 5 category scores>,
  "severity": "<low|moderate|high>",
  "category_scores": {{
    "temporal": <integer 0-20>,
    "behavioral": <integer 0-20>,
    "content": <integer 0-20>,
    "structural": <integer 0-20>,
    "relational": <integer 0-20>
  }},
  "flags": [
    {{
      "category": "<temporal|behavioral|content|structural|relational>",
      "flag": "<concise one-sentence description of the specific anomaly>",
      "weight": <integer 1-20 — how much this specific flag contributes to the category score>,
      "evidence_quote": "<exact phrase or sentence copied from the document content above that supports this flag — not paraphrased>"
    }}
  ],
  "summary": "<1-2 sentence plain-English explanation of the most significant anomaly, or 'No significant anomalies detected.' if score is below 30>"
}}

STRICT RULES:
1. severity MUST be "low" for score 0-29, "moderate" for 30-64, "high" for 65-100.
2. anomaly_score MUST equal temporal + behavioral + content + structural + relational exactly.
3. flags array MUST be empty [] when severity is "low".
4. evidence_quote MUST be an exact verbatim substring from the document content — never paraphrased.
5. Do NOT flag routine forensic content (listing people, dates, or locations is NOT anomalous by itself).
6. Base analysis ONLY on the provided document content and case context — no outside knowledge."""

    def __init__(self):
        self.llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            temperature=0,
            api_key=settings.GROQ_API_KEY,
            max_retries=3,
        )

    # ------------------------------------------------------------------
    # Context builders
    # ------------------------------------------------------------------

    def _build_case_context(
        self,
        all_files: List[str],
        graph_data: Dict[str, Any],
        timeline_data: Dict[str, Any],
    ) -> str:
        """Produce a compact cross-document baseline for the LLM to compare against."""
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])
        events = timeline_data.get("timeline", [])

        persons = [n["name"] for n in nodes if n.get("type", "").lower() == "person"]
        orgs    = [n["name"] for n in nodes if n.get("type", "").lower() == "organization"]
        locs    = [n["name"] for n in nodes if n.get("type", "").lower() == "location"]
        money   = [n["name"] for n in nodes if n.get("type", "").lower() == "money"]

        # Timeline stats
        raw_ts = [e.get("timestamp", "") for e in events
                  if e.get("timestamp") and e["timestamp"] not in ("Unknown", "")]
        date_range = f"{min(raw_ts)} to {max(raw_ts)}" if raw_ts else "Unknown"
        critical_events = [e for e in events if e.get("type") == "critical"]
        warning_events  = [e for e in events if e.get("type") == "warning"]

        # Established relationships (capped to avoid token bloat)
        rel_lines = []
        for edge in edges[:25]:
            rel_lines.append(
                f"  {edge.get('source','')} --[{edge.get('relationship','')}]--> {edge.get('target','')}"
            )

        lines = [
            f"Total documents in case: {len(all_files)}",
            f"Document filenames: {', '.join(all_files)}",
            f"Known persons across all documents: {', '.join(persons[:30]) if persons else 'None extracted'}",
            f"Known organizations: {', '.join(orgs[:15]) if orgs else 'None extracted'}",
            f"Known locations: {', '.join(locs[:15]) if locs else 'None extracted'}",
            f"Financial entities/amounts seen: {', '.join(money[:10]) if money else 'None extracted'}",
            f"Overall case timeline range: {date_range}",
            f"Total timeline events across all documents: {len(events)} "
            f"({len(critical_events)} critical, {len(warning_events)} warning)",
            "Established relationships:",
            "\n".join(rel_lines) if rel_lines else "  None extracted yet",
        ]
        return "\n".join(lines)

    def _get_doc_timeline_events(self, filename: str, timeline_data: Dict[str, Any]) -> str:
        """Return a formatted list of timeline events attributed to this document."""
        events = timeline_data.get("timeline", [])
        doc_events = [e for e in events if e.get("source_file", "") == filename]

        if not doc_events:
            return "No timeline events extracted from this document yet. " \
                   "(Run 'Extract Timeline' first for richer anomaly detection.)"

        lines = []
        for e in doc_events:
            lines.append(
                f"  [{e.get('type','info').upper()}] ts={e.get('timestamp','?')} | "
                f"event=\"{e.get('event','')}\" | "
                f"actors={e.get('actors',[])} | "
                f"artifacts={e.get('artifacts',[])} | "
                f"confidence={e.get('confidence','medium')}"
            )
        return "\n".join(lines)

    def _get_doc_entities(
        self, filename: str, graph_data: Dict[str, Any], content: str
    ) -> str:
        """Return entities and relationships relevant to this document."""
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        if not nodes:
            return "No entities extracted yet. " \
                   "(Run 'Extract from Evidence' first for richer anomaly detection.)"

        content_lower = content.lower()
        # Primary: nodes whose names appear in this doc's text
        relevant_nodes = [n for n in nodes if n.get("name", "").lower() in content_lower]
        if not relevant_nodes:
            # Fall back to all nodes (names may appear as abbreviations)
            relevant_nodes = nodes[:20]

        relevant_ids = {n["id"] for n in relevant_nodes}
        relevant_edges = [
            e for e in edges
            if e.get("source") in relevant_ids or e.get("target") in relevant_ids
        ]

        lines = ["Entities present in document:"]
        for n in relevant_nodes[:25]:
            desc = f" — {n['description']}" if n.get("description") else ""
            lines.append(f"  [{n.get('type','?').upper()}] {n.get('name','?')}{desc}")

        if relevant_edges:
            lines.append("Relationships involving these entities:")
            for e in relevant_edges[:20]:
                lines.append(
                    f"  {e.get('source','')} --[{e.get('relationship','')}]--> {e.get('target','')}"
                )

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Per-document scoring
    # ------------------------------------------------------------------

    def score_document(
        self,
        filename: str,
        file_type: str,
        content: str,
        case_context: str,
        timeline_events_text: str,
        entities_text: str,
    ) -> Optional[DocumentAnomaly]:
        """Send one document to the LLM for anomaly scoring; return a DocumentAnomaly."""

        # Truncate intelligently: keep first 5 000 and last 2 000 chars
        if len(content) > 8000:
            content = (
                content[:5000]
                + "\n\n[... middle section truncated for token efficiency ...]\n\n"
                + content[-2000:]
            )

        try:
            prompt = ChatPromptTemplate.from_template(self.DOCUMENT_ANOMALY_PROMPT)
            chain  = prompt | self.llm

            response = chain.invoke({
                "case_context":        case_context,
                "filename":            filename,
                "file_type":           file_type,
                "document_content":    content,
                "timeline_events":     timeline_events_text,
                "entities_and_relations": entities_text,
            })

            response_text = response.content.strip()

            # Extract JSON from response (handle LLM wrapping it in markdown fences)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(response_text)

            # --- Validate and enforce consistency ---
            cat_scores: Dict[str, int] = {}
            for cat in ("temporal", "behavioral", "content", "structural", "relational"):
                raw = data.get("category_scores", {}).get(cat, 0)
                cat_scores[cat] = max(0, min(20, int(raw)))

            # Recalculate score from categories to enforce the sum rule
            score = max(0, min(100, sum(cat_scores.values())))

            # Derive severity from actual score
            if score < 30:
                severity = "low"
            elif score < 65:
                severity = "moderate"
            else:
                severity = "high"

            # Parse flags — skip if severity is low
            flags: List[AnomalyFlag] = []
            if severity != "low":
                for f in data.get("flags", []):
                    flags.append(AnomalyFlag(
                        category=f.get("category", "content"),
                        flag=f.get("flag", ""),
                        weight=max(0, min(20, int(f.get("weight", 5)))),
                        evidence_quote=f.get("evidence_quote", ""),
                    ))

            return DocumentAnomaly(
                filename=filename,
                anomaly_score=score,
                severity=severity,
                flags=flags,
                summary=data.get("summary", ""),
                category_scores=cat_scores,
            )

        except json.JSONDecodeError as e:
            print(f"[Anomaly] JSON parse error for {filename}: {e}")
            return None
        except Exception as e:
            print(f"[Anomaly] Error scoring {filename}: {e}")
            traceback.print_exc()
            return None

    # ------------------------------------------------------------------
    # Person-level aggregation (no extra LLM call needed)
    # ------------------------------------------------------------------

    @staticmethod
    def compute_person_anomalies(
        doc_anomalies: List[DocumentAnomaly],
        graph_data: Dict[str, Any],
        doc_contents: Dict[str, str],  # filename -> raw text
    ) -> List[PersonAnomaly]:
        """
        For each Person node in the graph, find all documents that mention them
        and compute a weighted anomaly score:
            person_score = max_doc_score * 0.6 + avg_doc_score * 0.4

        This means one very suspicious document heavily implicates the person,
        but a pattern of moderately suspicious documents also matters.
        """
        nodes = graph_data.get("nodes", [])
        person_nodes = [n for n in nodes if n.get("type", "").lower() == "person"]

        if not person_nodes:
            return []

        doc_map: Dict[str, DocumentAnomaly] = {a.filename: a for a in doc_anomalies}
        results: List[PersonAnomaly] = []

        for person in person_nodes:
            name       = person.get("name", "")
            name_lower = name.lower()

            contributing_docs: List[str] = []
            associated_scores: List[int] = []

            for fname, content in doc_contents.items():
                if name_lower in content.lower() and fname in doc_map:
                    contributing_docs.append(fname)
                    associated_scores.append(doc_map[fname].anomaly_score)

            if not associated_scores:
                continue  # person not found in any scored document

            max_score = max(associated_scores)
            avg_score = sum(associated_scores) / len(associated_scores)
            person_score = max(0, min(100, int(max_score * 0.6 + avg_score * 0.4)))

            if person_score < 30:
                severity = "low"
            elif person_score < 65:
                severity = "moderate"
            else:
                severity = "high"

            # Collect top flags from contributing docs that relate to this person
            top_flags: List[AnomalyFlag] = []
            seen_flag_keys: set = set()
            for fname in contributing_docs:
                if fname in doc_map:
                    for flag in doc_map[fname].flags:
                        # Include if the flag's quote mentions the person OR is behavioral/relational
                        if (
                            name_lower in flag.evidence_quote.lower()
                            or flag.category in ("behavioral", "relational")
                        ):
                            key = flag.flag[:60]
                            if key not in seen_flag_keys:
                                seen_flag_keys.add(key)
                                top_flags.append(flag)
                                if len(top_flags) >= 5:
                                    break
                if len(top_flags) >= 5:
                    break

            results.append(PersonAnomaly(
                person_id=person.get("id", name_lower.replace(" ", "_")),
                person_name=name,
                anomaly_score=person_score,
                severity=severity,
                contributing_docs=contributing_docs,
                top_flags=top_flags,
            ))

        results.sort(key=lambda p: p.anomaly_score, reverse=True)
        return results


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_anomaly_detector: Optional[AnomalyDetector] = None


def get_anomaly_detector() -> AnomalyDetector:
    global _anomaly_detector
    if _anomaly_detector is None:
        _anomaly_detector = AnomalyDetector()
    return _anomaly_detector


# ---------------------------------------------------------------------------
# Session-level entry point (mirrors extract_timeline_from_session pattern)
# ---------------------------------------------------------------------------

def detect_anomalies_for_session(
    session_id: str,
    upload_dir: str,
    graph_data: Dict[str, Any],
    timeline_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run full anomaly detection for all documents in a session.

    Uses:
      - Raw document content (loaded from disk, same loaders as timeline/graph)
      - timeline_data: cached session timeline (from extract-timeline endpoint)
      - graph_data:    cached session knowledge graph (from extract-entities endpoint)

    Returns a dict with:
      - document_anomalies: list of per-document results (sorted high→low)
      - person_anomalies:   list of per-person aggregated results
      - summary stats
    """
    session_upload_dir = os.path.join(upload_dir, session_id)

    if not os.path.exists(session_upload_dir):
        return {
            "document_anomalies": [],
            "person_anomalies": [],
            "message": "No upload directory found for this session.",
        }

    from core.ingestion import (
        SafeDocLoader, SafeDocxLoader, SafePptxLoader,
        SafePptLoader, SafeRtfLoader, TextFileLoader,
        SUPPORTED_EXTENSIONS,
    )
    from langchain_community.document_loaders import PyPDFLoader

    # ---- Load all documents ----
    file_docs:  Dict[str, str] = {}   # filename -> combined text
    file_types: Dict[str, str] = {}   # filename -> extension without dot

    for root, _dirs, files in os.walk(session_upload_dir):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            ext   = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            try:
                if   ext == ".pdf":  loader = PyPDFLoader(fpath)
                elif ext == ".docx": loader = SafeDocxLoader(fpath)
                elif ext == ".doc":  loader = SafeDocLoader(fpath)
                elif ext == ".pptx": loader = SafePptxLoader(fpath)
                elif ext == ".ppt":  loader = SafePptLoader(fpath)
                elif ext == ".rtf":  loader = SafeRtfLoader(fpath)
                else:                loader = TextFileLoader(fpath)

                docs     = loader.load()
                combined = " ".join(d.page_content for d in docs).strip()
                if combined:
                    file_docs[fname]  = combined
                    file_types[fname] = ext.lstrip(".")
                    print(f"[Anomaly] Loaded: {fname} ({len(combined)} chars)")
            except Exception as e:
                print(f"[Anomaly] Could not load {fname}: {e}")

    if not file_docs:
        return {
            "document_anomalies": [],
            "person_anomalies": [],
            "message": "No readable documents found in this session.",
        }

    detector     = get_anomaly_detector()
    all_files    = list(file_docs.keys())
    case_context = detector._build_case_context(all_files, graph_data, timeline_data)

    print(f"[Anomaly] Scoring {len(file_docs)} documents for session {session_id}")

    doc_anomalies: List[DocumentAnomaly] = []

    for fname, content in file_docs.items():
        print(f"[Anomaly] → {fname}")

        timeline_text = detector._get_doc_timeline_events(fname, timeline_data)
        entities_text = detector._get_doc_entities(fname, graph_data, content)

        result = detector.score_document(
            filename=fname,
            file_type=file_types.get(fname, "unknown"),
            content=content,
            case_context=case_context,
            timeline_events_text=timeline_text,
            entities_text=entities_text,
        )

        if result:
            doc_anomalies.append(result)
        else:
            # Graceful fallback — keep the document in results with a zero score
            doc_anomalies.append(DocumentAnomaly(
                filename=fname,
                anomaly_score=0,
                severity="low",
                flags=[],
                summary="Anomaly scoring failed for this document.",
                category_scores={
                    "temporal": 0, "behavioral": 0, "content": 0,
                    "structural": 0, "relational": 0,
                },
            ))

    doc_anomalies.sort(key=lambda d: d.anomaly_score, reverse=True)

    person_anomalies = AnomalyDetector.compute_person_anomalies(
        doc_anomalies, graph_data, file_docs
    )

    high_count     = sum(1 for d in doc_anomalies if d.severity == "high")
    moderate_count = sum(1 for d in doc_anomalies if d.severity == "moderate")

    return {
        "document_anomalies": [d.to_dict() for d in doc_anomalies],
        "person_anomalies":   [p.to_dict() for p in person_anomalies],
        "total_documents":    len(doc_anomalies),
        "high_anomaly_count":     high_count,
        "moderate_anomaly_count": moderate_count,
        "message": (
            f"Analyzed {len(doc_anomalies)} documents: "
            f"{high_count} high, {moderate_count} moderate anomalies detected."
        ),
    }
