# Crime Nexus — Backend

FastAPI service powering the Crime Nexus forensics workspace: document ingestion, retrieval-augmented chat, timeline reconstruction, anomaly detection, and entity extraction.

For the architecture overview and full API reference, see the [root README](../README.md).

## Setup

```bash
uv sync
cp .env.example .env      # fill in GROQ_API_KEY
```

Or with pip:

```bash
pip install -r requirements.txt
```

Requires Python 3.13 and a running [Ollama](https://ollama.com) with the embedding model pulled:

```bash
ollama pull nomic-embed-text
```

## Running

```bash
uv run python main.py
```

Serves on `http://localhost:8000` with auto-reload. Interactive docs at `/docs`.

Run from this directory — all data paths are relative to it.

## Environment

`GROQ_API_KEY` is the only required variable; the service will not start without it. Everything else has a working default. See [`.env.example`](.env.example) for the full list with comments, or the environment table in the root README.

## Modules

| Path | Responsibility |
|---|---|
| `main.py` | FastAPI app, CORS, lifespan, and every HTTP endpoint |
| `core/ingestion.py` | Document loading, chunking, ZIP extraction, supported-format checks |
| `core/rag_pipeline.py` | Chroma vector store, retriever, and the Groq chat chain |
| `core/timeline_extractor.py` | Pulls dated events out of ingested evidence |
| `core/anomaly_detector.py` | Scores documents and events for inconsistencies |
| `core/User_profiling.py` | Entity extraction and relationship graph building |
| `core/models.py` | Shared Pydantic models |
| `config/settings.py` | Env-backed settings via pydantic-settings |
| `utils/session_handler.py` | SQLite persistence for sessions, messages, notes, people, timelines, anomalies |
| `utils/file_processing.py` | File helpers |
| `evaluation/rag_metrics.py` | Retrieval quality metrics |

## Models

| Task | Model | Provider |
|---|---|---|
| Chat, entity profiling, timeline extraction, anomaly detection | `qwen/qwen3.8-27b` | Groq |
| Embeddings | `nomic-embed-text` | Ollama (local) |

## Generated directories

`chroma_db/` and `data/` are created on first run and are gitignored:

- `data/forensics.db` — SQLite database
- `data/uploads/<session>/` — uploaded evidence and extracted text
- `chroma_db/` — Chroma vector store, one collection per session

Deleting either resets that layer; the app recreates it on the next run.
