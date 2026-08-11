# Repo Restructure and README — Design

**Date:** 2026-08-12
**Repo:** daxmodi1/Crime-Nexus
**Branch:** `chore/restructure-and-readme`

## Goal

Give the repository a consistent directory layout and real documentation, without changing how the application behaves.

## Hard constraint

Runtime behavior stays identical. No source logic changes, no dependency changes, no route changes.

## Current state

| Area | Finding |
|---|---|
| Layout | `Back-end/` and `front-end/` use inconsistent naming styles |
| Docs | No root README; `Back-end/README.md` is empty; `front-end/README.md` is unmodified Vite boilerplate |
| Artifacts | 8.0M `Back-end/chroma_db/` and 3.4M `Back-end/data/` are tracked in git (77 binary files, plus case PDFs and `forensics.db`) |
| Secrets | `Back-end/config/settings.py:10` holds a literal Tavily API key in a public repo |
| Env docs | No `.env.example`; the required `GROQ_API_KEY` is undocumented |
| Frontend source | `front-end/src/` is already well organized (`components/{tabs,ui,layout,views}`, `utils/`, `lib/`) and needs no changes |
| Backend source | `main.py` is 1062 lines holding every route; left alone by explicit decision (see Out of scope) |

## Safety analysis for the directory rename

Verified before designing:

- `git grep` for `Back-end|front-end` across tracked files returns exactly one hit: the `"name"` field in `front-end/package.json`. No import, config, or script refers to either directory by name.
- All backend filesystem paths are relative to the process working directory: `UPLOAD_DIR = "data/uploads"` (`main.py:36`), `DB_PATH = "data/forensics.db"` (`utils/session_handler.py:7`), `CHROMA_DB_PATH = "./chroma_db"` (`config/settings.py:6`).
- Backend imports are top-level package imports (`from core.rag_pipeline import ...`) resolved from the working directory, not from an absolute path.

Renaming the parent directory therefore cannot break imports or runtime paths, as long as commands are still run from inside the renamed directory.

## Changes

Executed in this order:

1. Create branch `chore/restructure-and-readme`.
2. `git mv Back-end backend` and `git mv front-end frontend`. Git records these as renames, so per-file history is preserved.
3. `git rm -r --cached backend/chroma_db backend/data`. Untracks only — both directories stay on disk, so the backend keeps running against its existing vector store and database.
4. Add a root `.gitignore` covering the untracked artifacts plus `.env`, `node_modules/`, `dist/`, `__pycache__/`, `.venv/`. The existing per-directory `.gitignore` files stay as they are.

   No `.gitkeep` placeholder is added for `backend/data/`. It is not needed: `main.py:37` runs `os.makedirs("data/uploads", exist_ok=True)` at import time, which creates `data/` before `session_handler._get_connection()` opens `data/forensics.db`. A fresh clone therefore bootstraps its own empty database and upload directory. Chroma likewise creates `./chroma_db` on first use.
5. Edit `backend/config/settings.py` line 10: replace the Tavily key literal with `""`, matching the `GOOGLE_API_KEY: str = ""` pattern on the line above.
6. Edit `frontend/package.json`: `"name": "front-end"` becomes `"name": "frontend"`. The package is `"private": true` and never published, so this is cosmetic.
7. Write documentation: root `README.md`, `backend/README.md`, `frontend/README.md`, `backend/.env.example`, `frontend/.env.example`.
8. Commit to the branch. Do not push — the user pushes when satisfied.

## README content

All content is derived by reading the code. Nothing is inferred or invented.

Root `README.md` sections:

- **Overview** — FastAPI + LangChain digital-forensics RAG application. Title taken from `main.py`: "NEXUS - Digital Forensics RAG API".
- **Features** — evidence upload (single file and zip), RAG chat with optional Tavily deep research, timeline reconstruction, anomaly detection, entity extraction with graph view, investigation notes, session management.
- **Architecture** — mermaid diagram: React/Vite frontend to FastAPI backend, backend to Chroma vector store, SQLite `forensics.db`, Groq LLM, and Ollama embeddings.
- **Tech stack** — Python 3.13, FastAPI, LangChain, Chroma, Docling, Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`), Ollama (`nomic-embed-text`); React 19, Vite 7, Tailwind 4, Supabase, react-force-graph-2d.
- **Prerequisites** — Python 3.13, uv, Node 18+, Ollama running with `nomic-embed-text` pulled, a Groq API key.
- **Setup** — `uv sync` for the backend, `npm install` for the frontend, plus `.env` creation from the examples.
- **Environment variables** — table covering backend `GROQ_API_KEY` (required), `TAVILY_API_KEY`, `GOOGLE_API_KEY`, `OLLAMA_BASE_URL`, `CHROMA_DB_PATH`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `TOP_K_RETRIEVAL`; frontend `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Running** — backend on port 8000, frontend on port 5173. CORS in `main.py` allows only `localhost`/`127.0.0.1` on ports 5173 and 3000.
- **Project structure** — annotated directory tree.
- **API reference** — endpoints grouped by area: sessions, notes, evidence, chat, entities, timeline, anomalies.
- **Troubleshooting** — Ollama not running, missing Groq key, CORS origin mismatch.

`backend/README.md` and `frontend/README.md` cover their own half only: setup, environment variables, run commands, and a module map. They link back to the root README rather than duplicating the architecture section.

## Verification

| Check | Expected result |
|---|---|
| `git status` | Moved files show status `R` (rename) with no content diff |
| `git diff` on tracked source | Only `settings.py` line 10 and the `package.json` name field |
| `cd backend && uv run python -c "import main"` | Imports resolve after the rename |
| `cd frontend && npm run build` | Build succeeds |
| `ls backend/chroma_db backend/data` | Both still present on disk after `git rm --cached` |

A live end-to-end run is not part of verification: it needs the user's Groq API key and a running Ollama instance.

## Out of scope

- Splitting `main.py` into routers. Considered and explicitly rejected for this pass to keep behavior risk at zero.
- Renaming `core/User_profiling.py` to snake_case — it is an import site, so it belongs with the router work.
- Rewriting git history to purge the artifacts and the leaked key. Rejected: it requires a force-push that would break existing clones and open PRs on a shared repo.
- Adding LICENSE or CONTRIBUTING files.

## Known follow-ups for the user

- Rotate the Tavily API key at tavily.com. It is public in git history, and removing the literal from the working tree does not remove it from past commits.
- `backend/data/uploads/` contains case PDFs that remain publicly readable in git history.
