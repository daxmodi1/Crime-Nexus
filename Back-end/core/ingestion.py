import os
import zipfile
import shutil
from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.models import EvidenceMetadata
from config.settings import settings

try:
    from langchain_docling import DoclingLoader
    from langchain_docling.loader import ExportType
except ImportError:
    DoclingLoader = None

SUPPORTED_EXTENSIONS = [
    ".pdf", ".docx", ".doc", ".pptx", ".ppt",
    ".txt", ".csv", ".json", ".log", ".rtf"
]

DOCLING_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".rtf"}
TEXT_EXTENSIONS    = {".txt", ".csv", ".json", ".log"}


class TextFileLoader:
    """Simple loader for plain text-based files."""

    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self) -> List[Document]:
        try:
            with open(self.file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return [Document(
                page_content=content,
                metadata={"source": self.file_path}
            )]
        except Exception as e:
            raise RuntimeError(f"Failed to read text file: {e}")


# ---------------------------------------------------------------------------
# ZIP helpers
# ---------------------------------------------------------------------------

def is_supported_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in SUPPORTED_EXTENSIONS


def extract_zip_file(zip_path: str, extract_to: str) -> List[str]:
    """
    Extract a ZIP file and return a flat list of extracted file paths.
    Only extracts supported evidence file types.
    """
    extracted_files = []

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for file_info in zip_ref.infolist():
                if file_info.is_dir():
                    continue

                filename = os.path.basename(file_info.filename)

                if filename.startswith(".") or filename.startswith("__"):
                    continue

                if not is_supported_file(filename):
                    print(f"[ZIP] Skipping unsupported file: {filename}")
                    continue

                target_path = os.path.join(extract_to, filename)
                base, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(target_path):
                    target_path = os.path.join(extract_to, f"{base}_{counter}{ext}")
                    counter += 1

                with zip_ref.open(file_info) as src, open(target_path, "wb") as dst:
                    shutil.copyfileobj(src, dst)

                extracted_files.append(target_path)
                print(f"[ZIP] Extracted: {filename} → {target_path}")

        return extracted_files

    except zipfile.BadZipFile:
        raise ValueError("Invalid or corrupted ZIP file")
    except Exception as e:
        raise RuntimeError(f"Failed to extract ZIP file: {e}")


# ---------------------------------------------------------------------------
# Core loader
# ---------------------------------------------------------------------------

def load_and_split_document(
    file_path: str,
    metadata: EvidenceMetadata
) -> List[Document]:
    """
    Load a document and return LLM-ready chunks, each carrying full
    chain-of-custody metadata including the source filename.

    Flow:
        1. Route to Docling (rich formats) or TextFileLoader (plain text)
        2. Merge all Docling elements into ONE document per file
        3. Attach forensic metadata + filename to the merged document
        4. Split into fixed-size chunks (every chunk inherits the metadata)
        5. Validate that every chunk has a filename — fail loudly if not
    """
    ext = os.path.splitext(file_path)[1].lower()
    filename = os.path.basename(file_path)

    # ------------------------------------------------------------------
    # Step 1 — pick loader
    # ------------------------------------------------------------------
    if ext in DOCLING_EXTENSIONS:
        if DoclingLoader is None:
            raise ImportError(
                "Docling is not installed. Run: pip install docling langchain-docling"
            )
        loader = DoclingLoader(file_path=file_path, export_type=ExportType.MARKDOWN)
        loader_name = "Docling"

    elif ext in TEXT_EXTENSIONS:
        loader = TextFileLoader(file_path)
        loader_name = "TextLoader"

    else:
        raise ValueError(f"Unsupported forensic evidence format: {ext}")

    print(f"[INGEST] Loading '{filename}' via {loader_name}...")

    # ------------------------------------------------------------------
    # Step 2 — load and merge into ONE document per file
    #
    # Docling may return many small element-level documents (one per
    # heading, paragraph, table). If we split those individually the
    # chunk boundaries are unpredictable and CHUNK_SIZE is ignored.
    # Merging first gives the text splitter a clean single string to
    # work with, producing consistent chunk sizes every time.
    # ------------------------------------------------------------------
    raw_docs = loader.load()

    if not raw_docs:
        print(f"[INGEST] Warning: '{filename}' was empty or could not be parsed.")
        return []

    merged_text = "\n\n".join(
        doc.page_content for doc in raw_docs if doc.page_content.strip()
    )

    if not merged_text.strip():
        print(f"[INGEST] Warning: '{filename}' produced no extractable text.")
        return []

    # --- Cache the extracted text for downstream tools (timeline, graph, etc.) ---
    try:
        session_dir = os.path.dirname(file_path)
        extracted_dir = os.path.join(session_dir, "extracted")
        os.makedirs(extracted_dir, exist_ok=True)
        # Save as filename.txt so TextFileLoader can easily pick it up
        extracted_path = os.path.join(extracted_dir, filename + ".txt")
        with open(extracted_path, "w", encoding="utf-8") as f:
            f.write(merged_text)
        print(f"[INGEST] Cached extracted text to: {extracted_path}")
    except Exception as e:
        print(f"[INGEST] Warning: Failed to cache extracted text: {e}")


    # ------------------------------------------------------------------
    # Step 3 — build ONE document with FULL metadata
    #
    # This is the fix for wrong/missing citations. Every chunk that
    # comes from this document will inherit all of these fields because
    # RecursiveCharacterTextSplitter copies metadata to every chunk.
    # ------------------------------------------------------------------
    merged_doc = Document(
        page_content=merged_text,
        metadata={
            # Forensic chain-of-custody fields from EvidenceMetadata
            **metadata.to_dict(),

            # Source identification — what the LLM will cite
            "filename":   filename,
            "filepath":   os.path.abspath(file_path),
            "extension":  ext,
            "file_size":  os.path.getsize(file_path),
            "loader":     loader_name,
        }
    )

    # ------------------------------------------------------------------
    # Step 4 — split into fixed-size chunks
    # ------------------------------------------------------------------
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
        add_start_index=True,  # adds 'start_index' to metadata for debugging
    )

    chunks = splitter.split_documents([merged_doc])

    # ------------------------------------------------------------------
    # Step 5 — stamp chunk index and validate metadata
    #
    # Fail loudly here during ingest rather than silently producing
    # wrong citations at query time.
    # ------------------------------------------------------------------
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"]  = i
        chunk.metadata["total_chunks"] = len(chunks)

        # Hard validation — every chunk MUST know its source file
        if not chunk.metadata.get("filename"):
            raise RuntimeError(
                f"Chunk {i} from '{filename}' is missing 'filename' metadata. "
                "This would cause wrong citations. Aborting ingest."
            )

    print(
        f"[INGEST] '{filename}' → {len(chunks)} chunks "
        f"(size={settings.CHUNK_SIZE}, overlap={settings.CHUNK_OVERLAP}) ✓"
    )
    return chunks