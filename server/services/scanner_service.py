"""
Scanner Service - Wraps existing Python scanner modules for FastAPI.
Reuses the complete logic from the terminal-based ClutterGuard.
"""
import sys
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory to path to import existing modules
_current_dir = Path(__file__).resolve().parent.parent.parent  # server/../ -> root
sys.path.insert(0, str(_current_dir))

from scanner import FileScanner
from analyzer import StorageAnalyzer
from duplicate_finder import DuplicateFinder
from security import SecurityAnalyzer
from recommendations import CleanupAdvisor
from reports import ReportGenerator
import utils
from server.services.analytics_service import analytics_payload
from server.services.database import get_collection, serialize_doc, utcnow
from server.services.notification_service import save_notifications
from server.services.report_service import save_report

# Store scan results in memory for the API session
_scan_cache: Dict[str, Any] = {}
SCAN_HISTORY_PATH = Path("data/scan_history.json")
LATEST_REPORT_PATH = Path("latest_report.json")


def _format_bytes(value: int) -> str:
    """Format bytes to human readable string."""
    return utils.format_bytes(value)


def _load_json(path: Path) -> Any:
    """Safely load JSON from file."""
    return utils.safe_load_json(path)


def _save_json(path: Path, data: Any) -> None:
    """Safely save JSON to file."""
    utils.safe_save_json(path, data)


def _invert_security_score(security_report: Dict[str, Any]) -> Dict[str, Any]:
    """
    Invert the security score so 100 = SAFE, 0 = HIGH RISK.
    The scanner returns a risk score where higher = more risk,
    but the UI expects a security score where higher = safer.
    """
    risk_score = security_report.get("security_score", 0)
    # Invert: 0 risk -> 100 safe, 100 risk -> 0 safe
    security_score = 100 - risk_score
    security_report["security_score"] = max(0, min(100, security_score))
    
    # Update risk status based on inverted score
    if security_score >= 75:
        security_report["risk_status"] = "SAFE"
    elif security_score >= 50:
        security_report["risk_status"] = "LOW RISK"
    elif security_score >= 25:
        security_report["risk_status"] = "MODERATE RISK"
    else:
        security_report["risk_status"] = "HIGH RISK"
    
    # Also add the raw risk score for reference
    security_report["raw_risk_score"] = risk_score
    
    return security_report


import logging

logger = logging.getLogger(__name__)


def _resolve_scan_path(scan_path: str) -> Path:
    """
    Resolve a scan path to an actual existing directory.
    Handles ~ shortcuts, relative paths, and OneDrive Desktop redirection.
    """
    # Expand ~ and resolve
    original_path = scan_path.strip()
    path = Path(original_path).expanduser().resolve()
    
    # If the path exists, return it
    if path.exists() and path.is_dir():
        logger.info(f"Resolved scan path: {path}")
        return path
    
    # Special handling for Desktop: Check OneDrive Desktop
    # On Windows with OneDrive, ~/Desktop may be redirected to OneDrive/Desktop
    if original_path.endswith('Desktop') or 'Desktop' in path.parts:
        home = Path.home()
        # Try OneDrive Desktop first
        onedrive_desktop = home / 'OneDrive' / 'Desktop'
        if onedrive_desktop.exists() and onedrive_desktop.is_dir():
            logger.info(f"Desktop found via OneDrive: {onedrive_desktop}")
            return onedrive_desktop.resolve()
        # Try regular Desktop
        regular_desktop = home / 'Desktop'
        if regular_desktop.exists() and regular_desktop.is_dir():
            logger.info(f"Desktop found: {regular_desktop}")
            return regular_desktop.resolve()
        # Try environment variable
        userprofile = os.environ.get('USERPROFILE', '')
        if userprofile:
            for candidate in [
                Path(userprofile) / 'Desktop',
                Path(userprofile) / 'OneDrive' / 'Desktop',
            ]:
                if candidate.exists() and candidate.is_dir():
                    logger.info(f"Desktop found via USERPROFILE: {candidate}")
                    return candidate.resolve()
    
    # Path doesn't exist - will raise the error in the caller
    return path


def _user_id(user_id: Optional[str]) -> str:
    return user_id or "local"


def run_scan(scan_path: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute a full scan using the existing Python scanner engine.
    
    Args:
        scan_path: The directory path to scan
        
    Returns:
        Dict containing scan results
    """
    path = _resolve_scan_path(scan_path)
    
    if not path.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")
    if not path.is_dir():
        raise NotADirectoryError(f"Not a directory: {path}")
    
    # Step 1: Scan folder
    scanner = FileScanner(str(path))
    files = scanner.scan_folder()
    
    # Step 2: Analyze
    analyzer = StorageAnalyzer(files)
    storage_total = analyzer.calculate_total_storage()
    breakdown = analyzer.file_type_breakdown()
    
    # Step 3: Find duplicates
    duplicate_finder = DuplicateFinder(files)
    duplicates_by_content = duplicate_finder.find_duplicate_content()
    wasted_space = duplicate_finder.calculate_wasted_space(duplicates_by_content)
    
    # Step 4: Security analysis
    security_analyzer = SecurityAnalyzer(files, path)
    security_report = security_analyzer.generate_security_report()
    # Invert score so 100 = SAFE
    security_report = _invert_security_score(security_report)
    
    # Step 5: Cleanup recommendations
    cleanup_advisor = CleanupAdvisor(files)
    recommendations = cleanup_advisor.generate_recommendations(security_report)
    top_large = cleanup_advisor.identify_large_files(10)
    
    # Step 6: Generate report
    report_generator = ReportGenerator(path, files, {
        "folders_scanned": scanner.folders_scanned,
        "scan_duration": scanner.scan_duration,
        "storage_used": storage_total,
        "security_score": security_report["security_score"],
        "risk_status": security_report["risk_status"],
    })
    
    summary = report_generator.generate_summary_report()
    summary["storage_used_formatted"] = _format_bytes(storage_total)
    summary["duplicate_files"] = len(duplicates_by_content)
    summary["duplicate_count"] = sum(len(g) - 1 for g in duplicates_by_content.values())
    summary["potential_recovery"] = _format_bytes(wasted_space)
    
    # Get old file counts
    old_counts = get_old_file_counts(files)
    
    # Prepare duplicate files list
    duplicate_files_list = []
    for content_hash, files_group in duplicates_by_content.items():
        sorted_files = sorted(files_group, key=lambda f: f.size, reverse=True)
        for file in sorted_files[1:]:
            duplicate_files_list.append({
                "filename": file.name,
                "size": _format_bytes(file.size),
                "size_bytes": file.size,
                "path": str(file.path),
                "hash": content_hash,
                "duplicates": len(sorted_files),
                "extension": file.extension,
            })
    
    # Build the complete scan result
    result = {
        "summary": summary,
        "storage": {
            "total_storage": _format_bytes(storage_total),
            "total_storage_bytes": storage_total,
            "type_breakdown": breakdown,
        },
        "security": security_report,
        "cleanup_recommendations": recommendations,
        "duplicate_files": duplicate_files_list,
        "old_files": {
            str(age): count for age, count in old_counts.items()
        },
        "large_files": [
            {
                "name": f.name,
                "size": _format_bytes(f.size),
                "size_bytes": f.size,
                "path": str(f.path),
            }
            for f in top_large
        ],
        "file_list": [file.to_dict() for file in files],
        "scan_metadata": {
            "folders_scanned": scanner.folders_scanned,
            "scan_duration": round(scanner.scan_duration, 2),
            "scan_path": str(path),
            "scan_date": datetime.now().isoformat(),
        },
    }
    
    # Save to cache and disk
    cache_key = f"latest:{_user_id(user_id)}"
    _scan_cache[cache_key] = result
    if not user_id:
        _scan_cache["latest"] = result
        _save_json(LATEST_REPORT_PATH, result)
    
    # Save scan history
    _save_scan_history(summary, result, user_id=user_id)
    if user_id:
        save_report(user_id, result)
        save_notifications(user_id, result)
    
    return result


def get_old_file_counts(files) -> Dict[str, int]:
    """Count files by age thresholds."""
    from datetime import datetime, timedelta
    thresholds = [30, 60, 90, 180, 365]
    counts: Dict[str, int] = {}
    today = datetime.now()
    for age in thresholds:
        cutoff = today - timedelta(days=age)
        counts[str(age)] = sum(1 for file in files if file.modified_date < cutoff)
    return counts


def _save_scan_history(summary: Dict[str, Any], result: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None) -> None:
    """Save scan to history."""
    record = {
        "scan_date": summary.get("scan_date", datetime.now().isoformat()),
        "scan_path": summary.get("scan_path", ""),
        "files_scanned": summary.get("files_scanned", 0),
        "folders_scanned": summary.get("folders_scanned", 0),
        "storage_used": summary.get("storage_used_formatted", "0 B"),
        "storage_used_bytes": summary.get("storage_used_bytes", 0),
        "duplicates_found": summary.get("duplicate_files", 0),
        "security_score": summary.get("security_score", 0),
        "risk_status": summary.get("risk_status", ""),
        "created_at": utcnow(),
    }
    if result:
        metadata = result.get("scan_metadata", {})
        security = result.get("security", {})
        storage = result.get("storage", {})
        record.update({
            "scan_date": metadata.get("scan_date", record["scan_date"]),
            "scan_path": metadata.get("scan_path", record["scan_path"]),
            "folders_scanned": metadata.get("folders_scanned", record["folders_scanned"]),
            "scan_duration": metadata.get("scan_duration", 0),
            "storage_used_bytes": storage.get("total_storage_bytes", record["storage_used_bytes"]),
            "duplicates_found": summary.get("duplicate_count", record["duplicates_found"]),
            "security_score": security.get("security_score", record["security_score"]),
            "risk_status": security.get("risk_status", record["risk_status"]),
        })

    if user_id:
        db_record = dict(record)
        db_record["user_id"] = user_id
        db_record["report"] = result
        get_collection("scan_history").insert_one(db_record)
        return

    history = _load_json(SCAN_HISTORY_PATH)
    history.insert(0, record)
    history = history[:50]
    _save_json(SCAN_HISTORY_PATH, history)


def get_latest_report(user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get the latest scan report from cache or disk."""
    if user_id:
        cache_key = f"latest:{user_id}"
        if cache_key in _scan_cache:
            return _scan_cache[cache_key]
        latest = get_collection("scan_history").find_one({"user_id": user_id}, sort=[("created_at", -1)])
        if latest:
            report = latest.get("report")
            if report:
                _scan_cache[cache_key] = report
                return report
        report_doc = get_collection("reports").find_one({"user_id": user_id}, sort=[("created_at", -1)])
        if report_doc:
            report = report_doc.get("raw_data")
            if report:
                _scan_cache[cache_key] = report
                return report
        return None

    if "latest" in _scan_cache:
        return _scan_cache["latest"]
    
    try:
        data = _load_json(LATEST_REPORT_PATH)
        if data:
            _scan_cache["latest"] = data
            return data
    except Exception:
        pass
    return None


def get_dashboard_data(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Get dashboard data from latest report."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    return {
        "summary": report.get("summary", {}),
        "storage": report.get("storage", {}),
        "security": report.get("security", {}),
        "cleanup_recommendations": report.get("cleanup_recommendations", []),
        "duplicate_files": report.get("duplicate_files", []),
        "large_files": report.get("large_files", []),
    }


def get_duplicate_files(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get duplicate files from latest report."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    duplicates = report.get("duplicate_files", [])
    
    # Calculate wasted space
    total_wasted = sum(d.get("size_bytes", 0) for d in duplicates)
    
    return {
        "duplicates": duplicates,
        "total_duplicates": len(duplicates),
        "total_groups": report.get("summary", {}).get("duplicate_files", 0),
        "wasted_space": _format_bytes(total_wasted),
        "wasted_space_bytes": total_wasted,
    }


def get_security_data(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Get security analysis from latest report."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    return report.get("security", {})


def get_cleanup_data(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Get cleanup suggestions from latest report."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    summary = report.get("summary", {})
    security = report.get("security", {})
    recommendations = report.get("cleanup_recommendations", [])
    old_files = report.get("old_files", {})
    large_files = report.get("large_files", [])
    duplicates = report.get("duplicate_files", [])
    
    # Calculate potential recovery
    wasted_bytes = sum(d.get("size_bytes", 0) for d in duplicates)
    potential_recovery = _format_bytes(wasted_bytes)
    
    return {
        "duplicate_files": {
            "title": "Duplicate Files",
            "count": len(duplicates),
            "size": potential_recovery,
            "description": "Identical files found in multiple locations",
        },
        "large_files": {
            "title": "Large Files",
            "count": len(large_files),
            "size": _format_bytes(sum(f.get("size_bytes", 0) for f in large_files)),
            "description": "Large files that may need review",
        },
        "old_files": {
            "title": "Old Files",
            "count": sum(old_files.values()) if old_files else 0,
            "size": "Varies",
            "description": "Files not modified in over 90 days",
        },
        "temporary_files": {
            "title": "Security Items",
            "count": security.get("suspicious_files", 0),
            "size": f"{security.get('malware_flags', 0)} alerts",
            "description": "Suspicious and flagged files",
        },
        "potential_recovery": potential_recovery,
        "recommendations": recommendations[:8],
    }


def get_reports_data(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Get complete reports data."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    summary = report.get("summary", {})
    security = report.get("security", {})
    duplicates = report.get("duplicate_files", [])
    
    scan_date = summary.get("scan_date", datetime.now().isoformat())
    try:
        date_obj = datetime.fromisoformat(scan_date)
        formatted_date = date_obj.strftime("%b %d, %Y")
    except Exception:
        formatted_date = scan_date[:10]
    
    wasted_bytes = sum(d.get("size_bytes", 0) for d in duplicates)
    
    reports_list = [
        {
            "title": "Storage Report",
            "date": formatted_date,
            "items": f"{summary.get('files_scanned', 0):,} files analyzed",
            "size": summary.get("storage_used_formatted", "0 B"),
            "type": "storage",
        },
        {
            "title": "Security Report",
            "date": formatted_date,
            "items": f"{security.get('suspicious_files', 0)} suspicious files detected",
            "size": f"{security.get('malware_flags', 0)} alerts",
            "type": "security",
        },
        {
            "title": "Cleanup Report",
            "date": formatted_date,
            "items": f"{_format_bytes(wasted_bytes)} potential recovery",
            "size": f"{len(duplicates)} duplicate files",
            "type": "cleanup",
        },
    ]
    
    persisted_reports = []
    if user_id:
        persisted_reports = [
            {
                "id": item.get("id"),
                "title": item.get("title", "Full ClutterGuard Scan Report"),
                "date": item.get("scan_date") or item.get("created_at"),
                "items": f"{item.get('summary', {}).get('files_scanned', 0):,} files analyzed",
                "size": item.get("summary", {}).get("storage_used_formatted", "0 B"),
                "type": "full",
            }
            for item in __import__("server.services.report_service", fromlist=["get_reports"]).get_reports(user_id)
        ]

    return {
        "reports": reports_list,
        "report_history": persisted_reports,
        "raw_data": report,
    }


def get_scan_history(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get scan history."""
    if user_id:
        docs = get_collection("scan_history").find({"user_id": user_id}, sort=[("created_at", -1)], limit=100)
        return [
            serialize_doc({k: v for k, v in doc.items() if k != "report"})
            for doc in docs
        ]
    return _load_json(SCAN_HISTORY_PATH)


def get_analytics_data(user_id: Optional[str] = None) -> Dict[str, Any]:
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    history = get_scan_history(user_id)
    return analytics_payload(history, report)


def _parse_file_list_for_age(file_list: list, min_age_days: int) -> list:
    """Parse and cache old files from file_list. Cached by min_age_days."""
    cache_key = f"old_files_{min_age_days}"
    if cache_key in _scan_cache:
        return _scan_cache[cache_key]
    
    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(days=min_age_days)
    
    old_files = []
    for f in file_list:
        try:
            mod_date_str = f.get("modified_date", "")
            if not mod_date_str:
                continue
            mod_date = datetime.fromisoformat(mod_date_str)
            if mod_date < cutoff:
                age_days = (datetime.now() - mod_date).days
                old_files.append({
                    "name": f.get("name", "Unknown"),
                    "path": f.get("path", ""),
                    "extension": f.get("extension", ""),
                    "size_bytes": f.get("size_bytes", 0),
                    "size": _format_bytes(f.get("size_bytes", 0)),
                    "modified_date": mod_date_str,
                    "created_date": f.get("created_date", ""),
                    "age_days": age_days,
                })
        except (ValueError, TypeError):
            continue
    
    old_files.sort(key=lambda x: x["age_days"], reverse=True)
    _scan_cache[cache_key] = old_files
    return old_files


def _parse_file_list_for_size(file_list: list, min_size_bytes: int) -> list:
    """Parse and cache large files from file_list. Cached by min_size_bytes."""
    cache_key = f"large_files_{min_size_bytes}"
    if cache_key in _scan_cache:
        return _scan_cache[cache_key]
    
    large_files = []
    for f in file_list:
        size = f.get("size_bytes", 0)
        if size >= min_size_bytes:
            large_files.append({
                "name": f.get("name", "Unknown"),
                "path": f.get("path", ""),
                "extension": f.get("extension", ""),
                "size_bytes": size,
                "size": _format_bytes(size),
                "modified_date": f.get("modified_date", ""),
                "created_date": f.get("created_date", ""),
            })
    
    large_files.sort(key=lambda x: x["size_bytes"], reverse=True)
    _scan_cache[cache_key] = large_files
    return large_files


def get_old_files_detail(min_age_days: int = 90, skip: int = 0, limit: int = 25, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Get old files detail from latest report, filtered by minimum age in days."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    file_list = report.get("file_list", [])
    old_files = _parse_file_list_for_age(file_list, min_age_days)
    total = len(old_files)
    paginated = old_files[skip:skip + limit]
    return {"files": paginated, "total": total}


def get_large_files_detail(min_size_bytes: int = 100 * 1024 * 1024, skip: int = 0, limit: int = 25, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Get large files detail from latest report, filtered by minimum size."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    file_list = report.get("file_list", [])
    large_files = _parse_file_list_for_size(file_list, min_size_bytes)
    total = len(large_files)
    paginated = large_files[skip:skip + limit]
    return {"files": paginated, "total": total}


def get_security_files_detail(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get security-flagged files from latest report."""
    report = get_latest_report(user_id)
    if not report:
        raise ValueError("No scan data available. Please run a scan first.")
    
    # Check cache first
    cache_key = "security_files_detail"
    if cache_key in _scan_cache:
        return _scan_cache[cache_key]
    
    security = report.get("security", {})
    details = security.get("details", {})
    file_list = report.get("file_list", [])
    
    # Build a name lookup from file_list
    file_lookup = {}
    for f in file_list:
        fname = f.get("name", "").lower()
        if fname:
            file_lookup[fname] = f
    
    flagged_files = []
    
    # Suspicious files
    suspicious_names = details.get("suspicious_names", [])
    for name in suspicious_names:
        f = file_lookup.get(name.lower(), {})
        flagged_files.append({
            "name": name,
            "path": f.get("path", ""),
            "extension": f.get("extension", ""),
            "size_bytes": f.get("size_bytes", 0),
            "size": _format_bytes(f.get("size_bytes", 0)),
            "risk_level": "Medium",
            "detection_reason": "Suspicious file name pattern detected",
            "modified_date": f.get("modified_date", ""),
            "created_date": f.get("created_date", ""),
        })
    
    # Malware files
    malware_names = details.get("malware_names", [])
    for name in malware_names:
        f = file_lookup.get(name.lower(), {})
        flagged_files.append({
            "name": name,
            "path": f.get("path", ""),
            "extension": f.get("extension", ""),
            "size_bytes": f.get("size_bytes", 0),
            "size": _format_bytes(f.get("size_bytes", 0)),
            "risk_level": "Critical",
            "detection_reason": "Malware signature detected",
            "modified_date": f.get("modified_date", ""),
            "created_date": f.get("created_date", ""),
        })
    
    # Hidden executables count added as items
    hidden_count = security.get("hidden_executables", 0)
    if hidden_count > 0:
        hidden_files = [f for f in file_list if f.get("name", "").startswith(".")]
        for f in hidden_files[:hidden_count]:
            flagged_files.append({
                "name": f.get("name", "Unknown"),
                "path": f.get("path", ""),
                "extension": f.get("extension", ""),
                "size_bytes": f.get("size_bytes", 0),
                "size": _format_bytes(f.get("size_bytes", 0)),
                "risk_level": "High",
                "detection_reason": "Hidden executable file",
                "modified_date": f.get("modified_date", ""),
                "created_date": f.get("created_date", ""),
            })
    
    # Cache the result since security data doesn't change between scans
    _scan_cache[cache_key] = flagged_files
    return flagged_files
