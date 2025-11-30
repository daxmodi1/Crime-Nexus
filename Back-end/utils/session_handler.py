import sqlite3
import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional

DB_PATH = "data/forensics.db"

def _get_connection():
    """Get SQLite database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def _init_database():
    """Initialize database tables if they don't exist."""
    conn = _get_connection()
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            graph_data TEXT DEFAULT NULL
        )
    ''')
    
    # Add graph_data column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE sessions ADD COLUMN graph_data TEXT DEFAULT NULL')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    ''')
    
    # Files table (with BLOB storage for actual file content)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_content BLOB,
            file_hash TEXT,
            file_type TEXT,
            file_size INTEGER,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on import
_init_database()

def get_all_sessions() -> List[Dict]:
    """Returns a list of all existing sessions sorted by date."""
    conn = _get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, title, created_at 
        FROM sessions 
        ORDER BY created_at DESC
    ''')
    
    sessions = []
    for row in cursor.fetchall():
        sessions.append({
            "id": row["id"],
            "title": row["title"],
            "created_at": row["created_at"],
            "messages": [],
            "files": []
        })
    
    conn.close()
    return sessions

def create_new_session(title: str = "New Case") -> str:
    """Creates a new session and returns the session_id."""
    session_id = f"case_{str(uuid.uuid4())[:8]}"
    
    conn = _get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO sessions (id, title, created_at)
        VALUES (?, ?, ?)
    ''', (session_id, title, datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    return session_id

def load_session(session_id: str) -> Optional[Dict]:
    """Loads a specific session with all messages and files."""
    conn = _get_connection()
    cursor = conn.cursor()
    
    # Get session info
    cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
    session_row = cursor.fetchone()
    
    if not session_row:
        conn.close()
        return None
    
    # Get messages
    cursor.execute('''
        SELECT role, content, timestamp 
        FROM messages 
        WHERE session_id = ? 
        ORDER BY timestamp ASC
    ''', (session_id,))
    
    messages = [{"role": row["role"], "content": row["content"]} 
                for row in cursor.fetchall()]
    
    # Get files
    cursor.execute('''
        SELECT filename 
        FROM files 
        WHERE session_id = ?
        ORDER BY uploaded_at ASC
    ''', (session_id,))
    
    files = [row["filename"] for row in cursor.fetchall()]
    
    conn.close()
    
    # Parse graph_data from JSON if present
    graph_data = {}
    try:
        if session_row["graph_data"]:
            graph_data = json.loads(session_row["graph_data"])
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    
    return {
        "id": session_row["id"],
        "title": session_row["title"],
        "created_at": session_row["created_at"],
        "messages": messages,
        "files": files,
        "graph_data": graph_data
    }

def save_session(session_id: str, data: Dict):
    """Updates session data including title and graph_data."""
    conn = _get_connection()
    cursor = conn.cursor()
    
    # Serialize graph_data to JSON if present
    graph_data_json = None
    if "graph_data" in data:
        graph_data_json = json.dumps(data["graph_data"])
    
    cursor.execute('''
        UPDATE sessions 
        SET title = ?, graph_data = COALESCE(?, graph_data)
        WHERE id = ?
    ''', (data.get("title", "Untitled Case"), graph_data_json, session_id))
    
    conn.commit()
    conn.close()

def add_message_to_session(session_id: str, role: str, content: str):
    """Appends a message to the session history."""
    conn = _get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO messages (session_id, role, content)
        VALUES (?, ?, ?)
    ''', (session_id, role, content))
    
    conn.commit()
    conn.close()

def file_exists_in_session(session_id: str, file_hash: str = None, filename: str = None) -> dict:
    """
    Check if a file already exists in the session.
    Returns dict with 'exists' boolean and 'filename' if found.
    Checks by hash first (most reliable), then by filename.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    # Check by hash first (content-based duplicate detection)
    if file_hash:
        cursor.execute('''
            SELECT filename FROM files 
            WHERE session_id = ? AND file_hash = ?
        ''', (session_id, file_hash))
        row = cursor.fetchone()
        if row:
            conn.close()
            return {"exists": True, "filename": row["filename"], "matched_by": "hash"}
    
    # Check by filename as fallback
    if filename:
        cursor.execute('''
            SELECT filename FROM files 
            WHERE session_id = ? AND filename = ?
        ''', (session_id, filename))
        row = cursor.fetchone()
        if row:
            conn.close()
            return {"exists": True, "filename": row["filename"], "matched_by": "filename"}
    
    conn.close()
    return {"exists": False, "filename": None, "matched_by": None}


def add_file_to_session(session_id: str, filename: str, file_content: bytes = None, 
                        file_hash: str = None, file_type: str = None) -> bool:
    """
    Stores uploaded file metadata and optionally the file content in database.
    Returns True if file was added, False if it already existed.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    # Check if file already exists by hash (content-based)
    if file_hash:
        cursor.execute('''
            SELECT COUNT(*) as count 
            FROM files 
            WHERE session_id = ? AND file_hash = ?
        ''', (session_id, file_hash))
        if cursor.fetchone()["count"] > 0:
            conn.close()
            return False  # Duplicate by hash
    
    # Check if file already exists by filename
    cursor.execute('''
        SELECT COUNT(*) as count 
        FROM files 
        WHERE session_id = ? AND filename = ?
    ''', (session_id, filename))
    
    if cursor.fetchone()["count"] > 0:
        conn.close()
        return False  # Duplicate by filename
    
    # Insert new file
    file_size = len(file_content) if file_content else 0
    
    cursor.execute('''
        INSERT INTO files (session_id, filename, file_content, file_hash, file_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (session_id, filename, file_content, file_hash, file_type, file_size))
    
    conn.commit()
    conn.close()
    return True

def get_file_from_session(session_id: str, filename: str) -> Optional[bytes]:
    """Retrieves file content from database."""
    conn = _get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT file_content 
        FROM files 
        WHERE session_id = ? AND filename = ?
    ''', (session_id, filename))
    
    row = cursor.fetchone()
    conn.close()
    
    return row["file_content"] if row else None

def export_file_from_session(session_id: str, filename: str, output_path: str):
    """Exports a file from database to disk."""
    file_content = get_file_from_session(session_id, filename)
    
    if file_content:
        with open(output_path, 'wb') as f:
            f.write(file_content)
        return True
    return False


def delete_session(session_id: str) -> bool:
    """
    Deletes a session and all associated data from the database.
    Returns True if session was deleted, False if not found.
    """
    conn = _get_connection()
    cursor = conn.cursor()
    
    # Check if session exists
    cursor.execute('SELECT id FROM sessions WHERE id = ?', (session_id,))
    if not cursor.fetchone():
        conn.close()
        return False
    
    # Delete messages for this session
    cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
    
    # Delete files for this session
    cursor.execute('DELETE FROM files WHERE session_id = ?', (session_id,))
    
    # Delete the session itself
    cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
    
    conn.commit()
    conn.close()
    return True