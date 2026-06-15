from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from pathlib import Path

from server.services.auth_service import get_current_user
from server.services.database import ObjectId, get_collection
from server.services.notification_service import get_notifications, mark_all_read
from server.services.report_service import pdf_response
from server.services.scanner_service import get_analytics_data, get_reports_data, get_scan_history, get_latest_report

router = APIRouter(prefix="/api", tags=["Reports"])


@router.get("/reports")
async def get_reports(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get complete reports data from the latest scan.
    
    Returns list of report summaries and raw data.
    """
    try:
        data = get_reports_data(str(user["_id"]))
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load reports: {str(e)}")


@router.get("/scan-history")
async def get_history(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """
    Get scan history.
    """
    try:
        return get_scan_history(str(user["_id"]))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load history: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.
    """
    return {"status": "ok", "message": "ClutterGuard API is running"}


@router.get("/analytics")
async def get_analytics(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return get_analytics_data(str(user["_id"]))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load analytics: {str(e)}")


@router.get("/notifications")
async def notifications(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return get_notifications(str(user["_id"]))


@router.post("/notifications/read")
async def notifications_read(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    mark_all_read(str(user["_id"]))
    return {"status": "ok"}


@router.get("/reports/{report_id}/pdf")
async def download_report_pdf(report_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    query_ids = [report_id]
    if ObjectId:
        try:
            query_ids.append(ObjectId(report_id))
        except Exception:
            pass

    report = None
    for candidate in query_ids:
        report = get_collection("reports").find_one({"_id": candidate, "user_id": str(user["_id"])})
        if report:
            break
    if not report:
        latest = get_latest_report(str(user["_id"]))
        if latest:
            report = {
                "summary": latest.get("summary", {}),
                "security": latest.get("security", {}),
                "scan_date": latest.get("scan_metadata", {}).get("scan_date"),
            }
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return pdf_response(report)
