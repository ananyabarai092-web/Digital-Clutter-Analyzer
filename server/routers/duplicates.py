from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from server.services.scanner_service import get_duplicate_files
from server.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Duplicates"])


@router.get("/duplicates")
async def get_duplicates(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get duplicate files from the latest scan.
    
    Returns list of duplicate files with filename, size, path, etc.
    """
    try:
        data = get_duplicate_files(str(user["_id"]))
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load duplicates: {str(e)}")
