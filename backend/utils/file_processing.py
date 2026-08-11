import hashlib
import os

def calculate_hash(file_bytes: bytes) -> str:
    """Calculates SHA256 hash of file bytes for forensic integrity."""
    sha256_hash = hashlib.sha256()
    sha256_hash.update(file_bytes)
    return sha256_hash.hexdigest()

def save_uploaded_file(uploaded_file, upload_dir: str) -> str:
    """Saves the uploaded streamlit file to disk and returns the path."""
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = os.path.join(upload_dir, uploaded_file.name)
    
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
        
    return file_path