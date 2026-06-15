"""
Storage Growth Router
Tracks storage usage over time and provides historical analytics data.
Stores periodic scan snapshots with timestamp, total size, file count.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from server.services.auth_service import get_current_user
from server.services.database import get_collection, serialize_doc, utcnow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/storage-growth", tags=["Storage Growth"])


def save_storage_snapshot(
    user_id: str,
    total_storage_bytes: int,
    file_count: int,
    total_duplicate_bytes: int = 0,
    duplicate_count: int = 0,
    scan_path: str = "",
) -> Dict[str, Any]:
    """
    Save a storage usage snapshot to the database.
    Called automatically after each scan completes.
    
    Args:
        user_id: The authenticated user ID
        total_storage_bytes: Total storage used in bytes
        file_count: Total number of files scanned
        total_duplicate_bytes: Total wasted space from duplicates
        duplicate_count: Number of duplicate file groups
        scan_path: The directory path that was scanned
    
    Returns:
        The saved snapshot document
    """
    snapshot = {
        "user_id": user_id,
        "timestamp": utcnow(),
        "total_storage_bytes": total_storage_bytes,
        "file_count": file_count,
        "total_duplicate_bytes": total_duplicate_bytes,
        "duplicate_count": duplicate_count,
        "scan_path": scan_path,
    }
    
    result = get_collection("storage_growth").insert_one(snapshot)
    snapshot["id"] = str(result.inserted_id)
    logger.info(
        f"Storage snapshot saved: {total_storage_bytes} bytes, "
        f"{file_count} files for user {user_id}"
    )
    return snapshot


@router.get("/history")
async def get_storage_growth_history(
    days: int = Query(90, description="Number of days of history to return"),
    interval: str = Query("day", description="Interval: 'day' or 'week'"),
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get historical storage growth data for charting.
    
    Returns aggregated storage snapshots over time.
    Supports daily and weekly intervals.
    """
    user_id = str(user["_id"])
    cutoff = utcnow() - timedelta(days=days)
    
    # Get all snapshots within the time range
    snapshots = list(
        get_collection("storage_growth").find(
            {
                "user_id": user_id,
                "timestamp": {"$gte": cutoff},
            },
            sort=[("timestamp", 1)]  # Oldest first
        )
    )
    
    if not snapshots:
        # If no snapshots but we have scan history, try to reconstruct
        # from existing scan history data
        scan_history = list(
            get_collection("scan_history").find(
                {"user_id": user_id},
                sort=[("created_at", -1)],
                limit=50
            )
        )
        if scan_history:
            for doc in scan_history:
                save_storage_snapshot(
                    user_id=user_id,
                    total_storage_bytes=doc.get("storage_used_bytes", 0),
                    file_count=doc.get("files_scanned", 0),
                    total_duplicate_bytes=doc.get("duplicates_found", 0) * 1048576,  # Estimate
                    duplicate_count=doc.get("duplicates_found", 0),
                    scan_path=doc.get("scan_path", ""),
                )
            snapshots = list(
                get_collection("storage_growth").find(
                    {"user_id": user_id, "timestamp": {"$gte": cutoff}},
                    sort=[("timestamp", 1)]
                )
            )
    
    # Format the data for the chart
    chart_data = []
    
    if interval == "week":
        # Aggregate by week
        weekly_map: Dict[str, Dict] = {}
        for snap in snapshots:
            ts = snap["timestamp"]
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts)
            # Get ISO week
            iso_year, iso_week, _ = ts.isocalendar()
            week_key = f"{iso_year}-W{iso_week:02d}"
            
            if week_key not in weekly_map:
                weekly_map[week_key] = {
                    "label": week_key,
                    "storage_gb": 0,
                    "file_count": 0,
                    "count": 0,
                }
            weekly_map[week_key]["storage_gb"] += snap.get("total_storage_bytes", 0) / (1024 ** 3)
            weekly_map[week_key]["file_count"] += snap.get("file_count", 0)
            weekly_map[week_key]["count"] += 1
        
        for key in sorted(weekly_map.keys()):
            entry = weekly_map[key]
            chart_data.append({
                "label": key,
                "storage_gb": round(entry["storage_gb"] / entry["count"], 2),
                "file_count": round(entry["file_count"] / entry["count"]),
            })
    else:
        # Daily aggregation
        daily_map: Dict[str, Dict] = {}
        for snap in snapshots:
            ts = snap["timestamp"]
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts)
            day_key = ts.strftime("%Y-%m-%d")
            
            if day_key not in daily_map:
                daily_map[day_key] = {
                    "label": day_key,
                    "storage_gb": 0,
                    "file_count": 0,
                    "count": 0,
                }
            daily_map[day_key]["storage_gb"] += snap.get("total_storage_bytes", 0) / (1024 ** 3)
            daily_map[day_key]["file_count"] += snap.get("file_count", 0)
            daily_map[day_key]["count"] += 1
        
        for key in sorted(daily_map.keys()):
            entry = daily_map[key]
            # Format label as short date
            try:
                dt = datetime.strptime(key, "%Y-%m-%d")
                label = dt.strftime("%b %d")
            except ValueError:
                label = key
            chart_data.append({
                "label": label,
                "storage_gb": round(entry["storage_gb"] / entry["count"], 2),
                "file_count": round(entry["file_count"] / entry["count"]),
            })
    
    # Calculate trend metrics
    trend = _calculate_trend(chart_data)
    
    return {
        "chart_data": chart_data,
        "trend": trend,
        "total_snapshots": len(snapshots),
        "period_days": days,
        "interval": interval,
    }


@router.get("/latest")
async def get_latest_snapshot(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get the most recent storage snapshot.
    Useful for quick dashboard display.
    """
    user_id = str(user["_id"])
    latest = get_collection("storage_growth").find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )
    
    if not latest:
        raise HTTPException(status_code=404, detail="No storage snapshots found")
    
    return serialize_doc(latest)


def _calculate_trend(chart_data: List[Dict]) -> Dict[str, Any]:
    """
    Calculate simple trend metrics from chart data.
    
    Returns:
        Dict with direction, growth_rate, and comparison stats
    """
    if len(chart_data) < 2:
        return {
            "direction": "stable",
            "growth_rate": 0,
            "description": "Not enough data points for trend analysis",
        }
    
    first_storage = chart_data[0].get("storage_gb", 0)
    last_storage = chart_data[-1].get("storage_gb", 0)
    
    if first_storage > 0:
        growth_rate = ((last_storage - first_storage) / first_storage) * 100
    else:
        growth_rate = 0
    
    # Determine direction
    if growth_rate > 5:
        direction = "increasing"
    elif growth_rate < -5:
        direction = "decreasing"
    else:
        direction = "stable"
    
    return {
        "direction": direction,
        "growth_rate": round(growth_rate, 2),
        "first_value_gb": round(first_storage, 2),
        "last_value_gb": round(last_storage, 2),
        "change_gb": round(last_storage - first_storage, 2),
        "data_points": len(chart_data),
        "description": (
            f"Storage growth trend is {direction} "
            f"({growth_rate:+.1f}% over the period)"
        ),
    }


def record_scan_snapshot(user_id: str, scan_result: Dict) -> None:
    """
    Convenience function to record a storage snapshot from scan results.
    Called by scanner_service after a scan completes.
    
    Args:
        user_id: The authenticated user ID
        scan_result: The full scan result dictionary
    """
    summary = scan_result.get("summary", {})
    storage = scan_result.get("storage", {})
    duplicates = scan_result.get("duplicate_files", [])
    
    total_duplicate_bytes = sum(d.get("size_bytes", 0) for d in duplicates)
    
    save_storage_snapshot(
        user_id=user_id,
        total_storage_bytes=storage.get("total_storage_bytes", 0),
        file_count=summary.get("files_scanned", 0),
        total_duplicate_bytes=total_duplicate_bytes,
        duplicate_count=summary.get("duplicate_files", 0),
        scan_path=summary.get("scan_path", ""),
    )