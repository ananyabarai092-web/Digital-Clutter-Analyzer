from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from server.routers.scan import ScanRequest
from server.services.auth_service import get_current_user
from server.services.notification_service import get_notifications
from server.services.scanner_service import (
    get_analytics_data,
    get_dashboard_data,
    get_reports_data,
    get_scan_history,
    run_scan,
)

router = APIRouter(tags=["Root API Aliases"])


@router.post("/scan")
async def scan(request: ScanRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        result = run_scan(request.path, user_id=str(user["_id"]))
        summary = result.get("summary", {})
        security = result.get("security", {})
        return {
            "status": "complete",
            "files_scanned": summary.get("files_scanned", 0),
            "storage_used": summary.get("storage_used_formatted", "0 B"),
            "storage_used_bytes": summary.get("storage_used_bytes", 0),
            "duplicate_files": summary.get("duplicate_files", 0),
            "risk_score": security.get("security_score", 0),
            "risk_status": security.get("risk_status", "UNKNOWN"),
            "message": f"Scan completed successfully. Found {summary.get('files_scanned', 0)} files.",
            "data": result,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except NotADirectoryError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Permission denied: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


@router.get("/scan-history")
async def scan_history(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return get_scan_history(str(user["_id"]))


@router.get("/analytics")
async def analytics(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return get_analytics_data(str(user["_id"]))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/notifications")
async def notifications(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return get_notifications(str(user["_id"]))


@router.get("/reports")
async def reports(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return get_reports_data(str(user["_id"]))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/dashboard")
async def dashboard(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return get_dashboard_data(str(user["_id"]))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
