from typing import Any, Dict

from server.services.database import get_collection, utcnow


def save_monitoring_settings(user_id: str, enabled: bool, folder_path: str) -> Dict[str, Any]:
    doc = {
        "user_id": user_id,
        "enabled": enabled,
        "folder_path": folder_path,
        "updated_at": utcnow(),
    }
    get_collection("folder_monitoring").update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return doc
