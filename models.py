import os
from datetime import datetime
from pathlib import Path
from typing import Dict

class FileRecord:
    def __init__(self, path: Path):
        self.path = path
        self.name = path.name
        self.extension = path.suffix.lower()
        self.size = self._safe_size()
        self.modified_date = self._safe_timestamp(path.stat().st_mtime)
        self.created_date = self._safe_timestamp(path.stat().st_ctime)

    def _safe_size(self) -> int:
        try:
            return self.path.stat().st_size
        except (OSError, PermissionError):
            return 0

    def _safe_timestamp(self, timestamp: float) -> datetime:
        try:
            return datetime.fromtimestamp(timestamp)
        except (OSError, ValueError, OverflowError):
            return datetime.min

    def get_size_mb(self) -> float:
        return self.size / (1024 * 1024)

    def get_age_days(self) -> int:
        delta = datetime.now() - self.modified_date
        return max(0, delta.days)

    def is_executable(self) -> bool:
        return self.extension in {".exe", ".bat", ".cmd", ".vbs", ".scr", ".ps1", ".dll"}

    def is_hidden(self) -> bool:
        return self.name.startswith('.') or self.path.name.startswith('.')

    def to_dict(self) -> Dict[str, str]:
        return {
            "name": self.name,
            "path": str(self.path),
            "extension": self.extension,
            "size_bytes": self.size,
            "modified_date": self.modified_date.isoformat(),
            "created_date": self.created_date.isoformat(),
        }
