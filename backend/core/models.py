from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class EvidenceMetadata(BaseModel):
    """Schema for ensuring every uploaded report has valid tracking info."""
    filename: str
    file_hash: str = Field(..., description="SHA256 hash for Chain of Custody")
    file_type: str
    upload_timestamp: datetime = Field(default_factory=datetime.now)
    case_id: Optional[str] = "DEFAULT-CASE"

    def to_dict(self):
        return {
            "filename": self.filename,
            "file_hash": self.file_hash,
            "upload_timestamp": self.upload_timestamp.isoformat(),
            "case_id": self.case_id
        }