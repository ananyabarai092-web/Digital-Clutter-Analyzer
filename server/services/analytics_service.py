from typing import Any, Dict, List


def storage_insights(history: List[Dict[str, Any]], latest_report: Dict[str, Any]) -> Dict[str, Any]:
    summary = latest_report.get("summary", {})
    storage = latest_report.get("storage", {})
    duplicates = latest_report.get("duplicate_files", [])
    total_bytes = storage.get("total_storage_bytes", summary.get("storage_used_bytes", 0)) or 0
    duplicate_bytes = sum(item.get("size_bytes", 0) for item in duplicates)
    previous = history[1] if len(history) > 1 else None
    delta_bytes = total_bytes - (previous or {}).get("storage_used_bytes", 0) if previous else 0

    return {
        "total_storage_bytes": total_bytes,
        "potential_recovery_bytes": duplicate_bytes,
        "duplicate_ratio": round((duplicate_bytes / total_bytes) * 100, 2) if total_bytes else 0,
        "trend_delta_bytes": delta_bytes,
        "trend_direction": "up" if delta_bytes > 0 else "down" if delta_bytes < 0 else "flat",
        "top_file_types": sorted(
            [
                {"type": key, **value}
                for key, value in (storage.get("type_breakdown") or {}).items()
            ],
            key=lambda item: item.get("count", 0),
            reverse=True,
        )[:5],
        "recommendations": latest_report.get("cleanup_recommendations", [])[:5],
    }


def analytics_payload(history: List[Dict[str, Any]], latest_report: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "summary": latest_report.get("summary", {}),
        "security": latest_report.get("security", {}),
        "storage": latest_report.get("storage", {}),
        "history": history,
        "storage_trends": [
            {
                "scan_date": item.get("scan_date") or item.get("created_at"),
                "storage_used": item.get("storage_used", "0 B"),
                "storage_used_bytes": item.get("storage_used_bytes", 0),
                "files_scanned": item.get("files_scanned", 0),
                "security_score": item.get("security_score", 0),
            }
            for item in reversed(history)
        ],
        "smart_insights": storage_insights(history, latest_report),
    }
