import shutil
from pathlib import Path
from typing import Any, Dict

from server.services.database import get_collection, utcnow

QUARANTINE_DIR = Path("data/quarantine")
QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)


def quarantine_file(user_id: str, file_path: str) -> Dict[str, Any]:
    source = Path(file_path).expanduser().resolve()
    if not source.exists() or not source.is_file():
        raise FileNotFoundError(f"File not found: {source}")
    destination = QUARANTINE_DIR / f"{utcnow().strftime('%Y%m%d%H%M%S')}_{source.name}"
    shutil.move(str(source), str(destination))
    record = {
        "user_id": user_id,
        "original_path": str(source),
        "quarantine_path": str(destination),
        "created_at": utcnow(),
    }
    get_collection("quarantine").insert_one(record)
    return record
