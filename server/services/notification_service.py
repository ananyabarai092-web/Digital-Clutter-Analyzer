from typing import Any, Dict, List

from server.services.database import get_collection, serialize_doc, utcnow


def build_scan_notifications(user_id: str, scan_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    security = scan_result.get("security", {})
    summary = scan_result.get("summary", {})
    notifications = []

    def add(title: str, description: str, severity: str, pinned: bool = False) -> None:
        notifications.append({
            "user_id": user_id,
            "title": title,
            "description": description,
            "severity": severity,
            "pinned": pinned,
            "unread": True,
            "created_at": utcnow(),
        })

    if security.get("security_score", 100) < 25 or security.get("risk_status") == "HIGH RISK":
        add("High Risk Files Detected", "Security score is critically low. Review suspicious files immediately.", "critical", True)
    if security.get("malware_flags", 0) > 0:
        add("Malware Signatures Detected", f"{security.get('malware_flags')} suspicious signatures were found.", "critical", True)
    if security.get("suspicious_files", 0) > 0:
        add("Suspicious Files Found", f"{security.get('suspicious_files')} files need security review.", "high")
    if summary.get("duplicate_count", 0) > 0:
        add("Duplicate Files Detected", f"{summary.get('duplicate_count')} duplicate files can be reviewed for cleanup.", "medium")
    if not notifications:
        add("Scan Completed", "No urgent issues were detected in the latest scan.", "low")
    return notifications


def save_notifications(user_id: str, scan_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    collection = get_collection("notifications")
    notifications = build_scan_notifications(user_id, scan_result)
    for item in notifications:
        collection.insert_one(item)
    return notifications


def get_notifications(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    docs = get_collection("notifications").find({"user_id": user_id}, sort=[("created_at", -1)], limit=limit)
    items = []
    for doc in docs:
        item = serialize_doc(doc)
        item["timestamp"] = item.get("created_at")
        items.append(item)
    return items


def mark_all_read(user_id: str) -> None:
    for item in get_collection("notifications").find({"user_id": user_id}):
        get_collection("notifications").update_one({"_id": item["_id"]}, {"$set": {"unread": False}})
