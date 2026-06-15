from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from server.services.scanner_service import get_dashboard_data
from server.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard")
async def get_dashboard(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get dashboard data from the latest scan.
    
    Returns:
    - Files Scanned
    - Storage Used
    - Duplicate Files
    - Security Score
    - Risk Level
    - Potential Recovery
    """
    try:
        data = get_dashboard_data(str(user["_id"]))
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {str(e)}")
