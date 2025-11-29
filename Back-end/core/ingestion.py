import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.models import EvidenceMetadata
from config.settings import settings

class SafePptxLoader:
    """
    Custom lightweight loader for .pptx files.
    Bypasses the heavy 'unstructured' library to prevent server crashes.
    Requires: uv add python-pptx
    """
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self):
        try:
            from pptx import Presentation
        except ImportError:
            raise ImportError("python-pptx library not found. Please run: uv add python-pptx")

        try:
            prs = Presentation(self.file_path)
            full_text = []
            
            for i, slide in enumerate(prs.slides):
                slide_text = []

                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_text.append(shape.text)
                
                if slide_text:
                    full_text.append(f"[Slide {i+1}]\n" + "\n".join(slide_text))

            return [Document(
                page_content="\n\n".join(full_text),
                metadata={"source": self.file_path}
            )]
            
        except Exception as e:
            raise RuntimeError(f"Failed to process PPTX: {str(e)}")

def load_and_split_document(file_path: str, metadata: EvidenceMetadata):
    """
    Robust loader that handles PDF, DOCX, and PPTX with specific, lighter libraries.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    loader = None
    
    try:
        # 1. Select the specific loader for the file type
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
            
        elif ext == ".docx":
            # Uses docx2txt (Lightweight)
            loader = Docx2txtLoader(file_path)
            
        elif ext == ".pptx":
            # Uses our custom SafePptxLoader (Lightweight)
            loader = SafePptxLoader(file_path)
            
        else:
            raise ValueError(f"Unsupported forensic report format: {ext}")
            
        # 2. Load the content
        print(f"Loading {ext} file: {file_path}...")
        raw_docs = loader.load()
        
        if not raw_docs:
            print("Warning: Document was empty or could not be parsed.")
            return []
    
        # 3. Attach Forensic Metadata (Chain of Custody)
        for doc in raw_docs:
            doc.metadata.update(metadata.to_dict())
            
        # 4. Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        chunks = text_splitter.split_documents(raw_docs)
        print(f"Successfully processed {len(chunks)} chunks.")
        return chunks

    except ImportError as e:
        error_msg = f"Missing dependency for {ext}. Error: {str(e)}"
        print(error_msg)
        raise ImportError("Please run: uv add python-docx python-pptx docx2txt")
        
    except Exception as e:
        print(f"Critical Error loading {file_path}: {e}")
        raise e