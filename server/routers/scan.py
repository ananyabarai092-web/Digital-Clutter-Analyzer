from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import sys
from pathlib import Path

from server.services.scanner_service import run_scan
from server.services.auth_service import get_current_user
from server.routers.storage_growth import record_scan_snapshot
from server.services.optimized_scanner import ProgressTracker

router = APIRouter(prefix="/api", tags=["Scan"])


class ScanRequest(BaseModel):
    path: str


@router.get("/scan/progress/{scan_id}")
async def get_scan_progress(
    scan_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get the current progress of a running scan.
    Used by the frontend to show a progress bar during scanning.
    """
    tracker = ProgressTracker.get(scan_id)
    if not tracker:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found or already completed")
    return tracker.to_dict()


@router.post("/scan")
async def start_scan(request: ScanRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Start a folder scan using the existing Python scanner engine.
    
    Input: { "path": "C:/Users/Example/Downloads" }
    Output: {
        "files_scanned": 12801,
        "storage_used": "1.94 GB",
        "duplicate_files": 15,
        "risk_score": 82,
        ...
    }
    """
    try:
        result = run_scan(request.path, user_id=str(user["_id"]))
        summary = result.get("summary", {})
        security = result.get("security", {})
        
        # Record storage growth snapshot for analytics
        try:
            record_scan_snapshot(str(user["_id"]), result)
        except Exception as snap_error:
            # Don't fail the scan if snapshot recording fails
            import logging
            logging.getLogger(__name__).warning(f"Failed to record storage snapshot: {snap_error}")
        
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
