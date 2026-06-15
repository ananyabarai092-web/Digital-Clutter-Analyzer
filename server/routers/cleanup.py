from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List

from server.services.scanner_service import get_cleanup_data, get_old_files_detail, get_large_files_detail, get_security_files_detail
from server.services.auth_service import get_current_user
from server.services.quarantine_service import quarantine_file

router = APIRouter(prefix="/api", tags=["Cleanup"])


@router.get("/cleanup")
async def get_cleanup(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get cleanup suggestions from the latest scan.
    
    Returns:
    - Duplicate Files
    - Large Files
    - Old Files
    - Potential Savings
    """
    try:
        data = get_cleanup_data(str(user["_id"]))
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load cleanup data: {str(e)}")


@router.get("/cleanup/old-files")
async def get_old_files(
    min_age_days: int = Query(90, description="Minimum age in days"),
    skip: int = Query(0, ge=0, description="Results to skip"),
    limit: int = Query(25, ge=1, le=100, description="Results per page"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Get old files detail from the latest scan with pagination."""
    try:
        data = get_old_files_detail(min_age_days, skip, limit, str(user["_id"]))
        return data  # Already returns {"files": [...], "total": N}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load old files: {str(e)}")


@router.get("/cleanup/large-files")
async def get_large_files(
    min_size_mb: int = Query(100, description="Minimum file size in MB"),
    skip: int = Query(0, ge=0, description="Results to skip"),
    limit: int = Query(25, ge=1, le=100, description="Results per page"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Get large files detail from the latest scan with pagination."""
    try:
        min_size_bytes = min_size_mb * 1024 * 1024
        data = get_large_files_detail(min_size_bytes, skip, limit, str(user["_id"]))
        return data  # Already returns {"files": [...], "total": N}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load large files: {str(e)}")


@router.get("/cleanup/security-files")
async def get_security_files(user: Dict[str, Any] = Depends(get_current_user)):
    """Get security-flagged files from the latest scan."""
    try:
        data = get_security_files_detail(str(user["_id"]))
        return {"files": data, "total": len(data)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load security files: {str(e)}")


class QuarantineRequest(BaseModel):
    path: str


@router.post("/quarantine")
async def quarantine(request: QuarantineRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return quarantine_file(str(user["_id"]), request.path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
